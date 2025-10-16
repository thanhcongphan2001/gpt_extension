// Popup script for GPT Chrome Extension
class PopupController {
  constructor() {
    this.isInitialized = false;
    this.currentTab = null;
    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      await this.loadCurrentTab();
      await this.loadSettings();
      this.setupEventListeners();

      this.updateUI();
      this.checkApiStatus();

      this.isInitialized = true;
      console.log("Popup initialized");
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      this.showError("Failed to initialize extension");
    }
  }

  async loadCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tabs[0];
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        "openai_api_key",
        "debug_mode",
      ]);

      // Load API key if exists
      const apiKeyInput = document.getElementById("api-key");
      if (result.openai_api_key && apiKeyInput) {
        apiKeyInput.value = result.openai_api_key;
      }

      // Show/hide debug section
      const debugSection = document.getElementById("debug-section");
      if (result.debug_mode && debugSection) {
        debugSection.style.display = "block";
        await this.loadDebugInfo();
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  setupEventListeners() {
    // API Key management
    const saveApiBtn = document.getElementById("save-api-key");
    if (saveApiBtn) {
      saveApiBtn.addEventListener("click", () => this.saveApiKey());
    }

    const apiKeyInput = document.getElementById("api-key");
    if (apiKeyInput) {
      apiKeyInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.saveApiKey();
      });
    }

    // Quick actions - only if they exist
    const gptPopupBtn = document.getElementById("gpt-popup");
    if (gptPopupBtn) {
      gptPopupBtn.addEventListener("click", () => this.openGPTPopup());
    }

    const lighthouseBtn = document.getElementById("lighthouse-audit");
    if (lighthouseBtn) {
      lighthouseBtn.addEventListener("click", () => this.runLighthouse());
    }
    document
      .getElementById("lighthouse-audit")
      .addEventListener("click", () => this.runLighthouseAudit());
    document
      .getElementById("toggle-debug")
      .addEventListener("click", () => this.toggleDebugPanel());

    // Settings
    document.getElementById("auto-inject").addEventListener("change", (e) => {
      this.saveSetting("auto_inject", e.target.checked);
    });

    document.getElementById("debug-mode").addEventListener("change", (e) => {
      this.saveSetting("debug_mode", e.target.checked);
      this.toggleDebugSection(e.target.checked);
    });

    document.getElementById("context-menu").addEventListener("change", (e) => {
      this.saveSetting("context_menu", e.target.checked);
    });

    // Debug actions
    document
      .getElementById("clear-logs")
      ?.addEventListener("click", () => this.clearLogs());
    document
      .getElementById("export-logs")
      ?.addEventListener("click", () => this.exportLogs());
    document
      .getElementById("test-api")
      ?.addEventListener("click", () => this.testApi());

    // Footer links
    document.getElementById("help-link").addEventListener("click", (e) => {
      e.preventDefault();
      this.openHelp();
    });

    document.getElementById("feedback-link").addEventListener("click", (e) => {
      e.preventDefault();
      this.openFeedback();
    });

    document.getElementById("about-link").addEventListener("click", (e) => {
      e.preventDefault();
      this.showAbout();
    });
  }

  async saveApiKey() {
    const apiKeyInput = document.getElementById("api-key");
    const saveButton = document.getElementById("save-api-key");
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      this.showError("Please enter an API key");
      return;
    }

    if (!apiKey.startsWith("sk-")) {
      this.showError("Invalid API key format");
      return;
    }

    try {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: "SET_API_KEY",
        data: { apiKey },
      });

      if (response.success) {
        this.showSuccess("API key saved successfully");
        apiKeyInput.value = "";
        await this.checkApiStatus();
      } else {
        this.showError("Failed to save API key: " + response.error);
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      this.showError("Failed to save API key");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save";
    }
  }

  async checkApiStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_API_KEY",
      });

      const statusIndicator = document.getElementById("status-indicator");
      const statusDot = statusIndicator.querySelector(".status-dot");
      const statusText = statusIndicator.querySelector(".status-text");
      const apiStatusElement = document.getElementById("api-status");

      if (response.success && response.data) {
        statusDot.classList.add("connected");
        statusText.textContent = "Connected";
        if (apiStatusElement) {
          apiStatusElement.textContent = "Configured";
        }
      } else {
        statusDot.classList.remove("connected");
        statusText.textContent = "Disconnected";
        if (apiStatusElement) {
          apiStatusElement.textContent = "Not configured";
        }
      }
    } catch (error) {
      console.error("Failed to check API status:", error);
    }
  }

  async saveApiKey() {
    try {
      const apiKeyInput = document.getElementById("api-key");
      const apiKey = apiKeyInput.value.trim();

      if (!apiKey) {
        this.showError("Please enter an API key");
        return;
      }

      if (!apiKey.startsWith("sk-")) {
        this.showError("Invalid API key format. Should start with 'sk-'");
        return;
      }

      await chrome.storage.local.set({ openai_api_key: apiKey });
      this.showSuccess("API key saved successfully!");

      // Update status
      await this.checkApiStatus();
    } catch (error) {
      console.error("Failed to save API key:", error);
      this.showError("Failed to save API key");
    }
  }

  async runLighthouse() {
    try {
      // Send message to background script for lighthouse audit
      await chrome.runtime.sendMessage({
        type: "LIGHTHOUSE_REQUEST",
        data: {
          tabId: this.currentTab.id,
          url: this.currentTab.url,
          title: this.currentTab.title,
        },
      });

      this.showSuccess("Lighthouse audit started...");
      window.close();
    } catch (error) {
      console.error("Failed to run lighthouse:", error);
      this.showError("Failed to run lighthouse audit");
    }
  }

  async openGPTPopup() {
    try {
      // Create a dedicated popup window for GPT chat
      const popup = await chrome.windows.create({
        url: chrome.runtime.getURL("gpt-popup.html"),
        type: "popup",
        width: 400,
        height: 600,
        left: screen.width - 420,
        top: 100,
      });

      this.showSuccess("GPT Chat popup opened!");
      window.close();
    } catch (error) {
      console.error("Failed to open GPT popup:", error);
      this.showError("Failed to open GPT chat popup");
    }
  }

  async analyzePage() {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: "ANALYZE_TEXT",
        data: {
          text: "Analyze this page",
          url: this.currentTab.url,
        },
      });
      window.close();
    } catch (error) {
      console.error("Failed to analyze page:", error);
      this.showError("Failed to analyze page. Make sure the page is loaded.");
    }
  }

  async runLighthouseAudit() {
    try {
      // Check if content script is ready
      await this.ensureContentScriptReady();

      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: "RUN_LIGHTHOUSE_AUDIT",
        data: {
          url: this.currentTab.url,
          title: this.currentTab.title,
        },
      });
      window.close();
    } catch (error) {
      console.error("Failed to run Lighthouse audit:", error);
      this.showError(
        "Failed to run Lighthouse audit. Try refreshing the page."
      );
    }
  }

  async toggleDebugPanel() {
    try {
      // Check if content script is ready
      await this.ensureContentScriptReady();

      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: "TOGGLE_DEBUG_PANEL",
      });
      window.close();
    } catch (error) {
      console.error("Failed to toggle debug panel:", error);
      this.showError("Failed to toggle debug panel. Try refreshing the page.");
    }
  }

  async ensureContentScriptReady() {
    try {
      // Try to ping the content script
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: "PING",
      });
    } catch (error) {
      // Content script not ready, try to inject it
      console.log("Content script not ready, injecting...");

      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ["content.js"],
        });

        // Wait a bit for the script to initialize
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (injectError) {
        console.error("Failed to inject content script:", injectError);
        throw new Error(
          "Cannot inject content script. Page may not support extensions."
        );
      }
    }
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      console.log(`Setting saved: ${key} = ${value}`);
    } catch (error) {
      console.error("Failed to save setting:", error);
      this.showError("Failed to save setting");
    }
  }

  toggleDebugSection(show) {
    const debugSection = document.getElementById("debug-section");
    if (show) {
      debugSection.style.display = "block";
      this.loadDebugInfo();
    } else {
      debugSection.style.display = "none";
    }
  }

  async loadDebugInfo() {
    try {
      // Update active tab info
      const activeTabElement = document.getElementById("active-tab");
      if (activeTabElement && this.currentTab) {
        activeTabElement.textContent = this.currentTab.url || "Unknown";
      }

      // Update extension version
      const manifest = chrome.runtime.getManifest();
      const versionElement = document.getElementById("extension-version");
      if (versionElement) {
        versionElement.textContent = manifest.version;
      }
    } catch (error) {
      console.error("Failed to load debug info:", error);
    }
  }

  async clearLogs() {
    try {
      await chrome.runtime.sendMessage({
        type: "CLEAR_LOGS",
      });
      this.showSuccess("Logs cleared");
    } catch (error) {
      console.error("Failed to clear logs:", error);
      this.showError("Failed to clear logs");
    }
  }

  async exportLogs() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "EXPORT_LOGS",
      });

      if (response.success) {
        const blob = new Blob([response.data.content], {
          type: response.data.mimeType,
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename;
        a.click();

        URL.revokeObjectURL(url);
        this.showSuccess("Logs exported");
      } else {
        this.showError("Failed to export logs: " + response.error);
      }
    } catch (error) {
      console.error("Failed to export logs:", error);
      this.showError("Failed to export logs");
    }
  }

  async testApi() {
    const testButton = document.getElementById("test-api");

    try {
      testButton.disabled = true;
      testButton.textContent = "Testing...";

      const response = await chrome.runtime.sendMessage({
        type: "TEST_API",
      });

      if (response.success) {
        this.showSuccess("API test successful");
      } else {
        this.showError("API test failed: " + response.error);
      }
    } catch (error) {
      console.error("API test failed:", error);
      this.showError("API test failed");
    } finally {
      testButton.disabled = false;
      testButton.textContent = "Test API";
    }
  }

  updateUI() {
    // Add any dynamic UI updates here
    document.body.classList.add("fade-in");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      ${
        type === "error"
          ? "background: #ffebee; color: #c62828; border: 1px solid #ffcdd2;"
          : ""
      }
      ${
        type === "success"
          ? "background: #e8f5e8; color: #2e7d32; border: 1px solid #c8e6c9;"
          : ""
      }
      ${
        type === "info"
          ? "background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb;"
          : ""
      }
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  openHelp() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("help.html"),
    });
  }

  openFeedback() {
    chrome.tabs.create({
      url: "https://github.com/your-repo/gpt-chrome-extension/issues",
    });
  }

  showAbout() {
    const manifest = chrome.runtime.getManifest();
    alert(
      `GPT Chrome Extension v${manifest.version}\n\nIntegrate GPT directly into your browser with debugging capabilities.\n\nDeveloped with ❤️ for productivity.`
    );
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});

// Add CSS animation
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
