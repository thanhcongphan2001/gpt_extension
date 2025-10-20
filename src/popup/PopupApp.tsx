import React, { useState, useEffect } from "react";

interface CurrentTab {
  id?: number;
  title?: string;
  url?: string;
}

interface MessageResponse {
  success: boolean;
  error?: string;
}

const PopupApp: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<CurrentTab | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    loadCurrentTab();
    loadApiKey();
  }, []);

  const loadCurrentTab = async (): Promise<void> => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      setCurrentTab(tab);
    } catch (error) {
      console.error("Failed to load current tab:", error);
    }
  };

  const loadApiKey = async (): Promise<void> => {
    try {
      const result = await chrome.storage.local.get(["openai_api_key"]);
      if (result.openai_api_key) {
        setApiKey(result.openai_api_key);
        setIsApiKeySet(true);
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    }
  };

  const saveApiKey = async (): Promise<void> => {
    if (!apiKey.trim()) {
      setMessage("Please enter a valid API key");
      return;
    }

    try {
      await chrome.storage.local.set({ openai_api_key: apiKey });
      setIsApiKeySet(true);
      setMessage("API key saved successfully!");

      // Send message to background to update GPT service
      chrome.runtime.sendMessage({
        type: "SET_API_KEY",
        data: { apiKey },
      });
    } catch (error) {
      console.error("Failed to save API key:", error);
      setMessage("Failed to save API key");
    }
  };

  const openGPTPopup = async () => {
    try {
      await chrome.windows.create({
        url: chrome.runtime.getURL("gpt-popup.html"),
        type: "popup",
        width: 400,
        height: 600,
        left: screen.width - 420,
        top: 100,
      });
      window.close();
    } catch (error) {
      console.error("Failed to open GPT popup:", error);
      setMessage("Failed to open GPT popup");
    }
  };

  const runLighthouseAudit = async () => {
    if (!currentTab) {
      setMessage("No active tab found");
      return;
    }

    setIsLoading(true);
    setMessage("🔍 Analyzing page performance...");

    try {
      const response = await chrome.runtime.sendMessage({
        type: "RUN_LIGHTHOUSE_AUDIT",
        data: {
          url: currentTab.url,
          tabId: currentTab.id,
        },
      });

      if (response.success) {
        setMessage(
          "✅ Lighthouse audit completed! Results opened in new window."
        );

        // Auto-clear success message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ Audit failed: ${response.error}`);
      }
    } catch (error) {
      console.error("Lighthouse audit failed:", error);
      setMessage("❌ Lighthouse audit failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showAbout = () => {
    const manifest = chrome.runtime.getManifest();
    alert(
      `GPT Chrome Extension v${manifest.version}\n\nIntegrate GPT directly into your browser with debugging capabilities.\n\nDeveloped with ❤️ for productivity.`
    );
  };

  return (
    <div className="extension-width extension-height bg-white">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <h1 className="text-lg font-bold text-shadow">GPT Chrome</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{isApiKeySet ? "🟢" : "🔴"}</span>
            <span className="text-sm font-medium">
              {isApiKeySet ? "Connected" : "Not Connected"}
            </span>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 flex-1 overflow-y-auto">
        {currentTab && (
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Current Page
            </h2>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-800 truncate">
                {currentTab.title}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {currentTab.url}
              </div>
            </div>
          </section>
        )}

        <section className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                !isApiKeySet
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 hover:shadow-md"
              }`}
              onClick={openGPTPopup}
              disabled={!isApiKeySet}
            >
              <span className="text-lg">💬</span>
              <span>GPT Chat Popup</span>
            </button>
            <button
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                isLoading || !currentTab
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 hover:shadow-md"
              }`}
              onClick={runLighthouseAudit}
              disabled={isLoading || !currentTab}
            >
              {isLoading && <div className="loading-spinner"></div>}
              <span className="text-lg">⚡</span>
              <span>{isLoading ? "Running..." : "Run Lighthouse Audit"}</span>
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            API Configuration
          </h2>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="password"
                placeholder="Enter OpenAI API Key (sk-...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="input-field flex-1"
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                onClick={saveApiKey}
              >
                Save
              </button>
            </div>
            {!isApiKeySet && (
              <div className="message-info">
                <p className="text-sm">
                  Get your API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-blue-900"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>
            )}
          </div>
        </section>

        {message && (
          <div
            className={`animate-fade-in ${
              message.includes("success")
                ? "message-success"
                : message.includes("failed") || message.includes("Failed")
                ? "message-error"
                : "message-info"
            }`}
          >
            {message}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 p-3 bg-gray-50">
        <button
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
          onClick={showAbout}
        >
          About v{chrome.runtime.getManifest().version}
        </button>
      </footer>
    </div>
  );
};

export default PopupApp;
