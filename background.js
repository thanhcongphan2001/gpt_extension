// Background service worker for GPT Chrome Extension
import { GPTService } from "./services/gpt-service.js";
import { LighthouseService } from "./services/lighthouse-service.js";

class BackgroundService {
  constructor() {
    this.gptService = new GPTService();
    this.lighthouseService = new LighthouseService();
    this.init();
  }

  async init() {
    this.setupMessageHandlers();
    await this.initializeGPTService();
  }

  async initializeGPTService() {
    try {
      const apiKey = await this.getStoredApiKey();
      if (apiKey) {
        await this.gptService.setApiKey(apiKey);
      }
    } catch (error) {
      console.error("Failed to initialize GPT service:", error);
    }
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "GPT_REQUEST":
          try {
            // Check if API key is available
            const apiKey = await this.getStoredApiKey();
            if (!apiKey) {
              throw new Error(
                "OpenAI API key not configured. Please set your API key in the extension popup."
              );
            }

            // Ensure GPT service has the API key
            await this.gptService.setApiKey(apiKey);

            // Use real GPT service only
            const response = await this.gptService.sendRequest(message.data);

            // Send response directly to popup window
            this.sendToPopupWindow("GPT_RESPONSE", response);
            sendResponse({ success: true, data: response });
          } catch (error) {
            console.error("GPT request failed:", error);
            const errorResponse = { error: error.message };
            this.sendToPopupWindow("GPT_RESPONSE", errorResponse);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case "GET_API_KEY":
          const apiKey = await this.getStoredApiKey();
          sendResponse({ success: true, data: apiKey });
          break;

        case "SET_API_KEY":
          await this.storeApiKey(message.data.apiKey);
          sendResponse({ success: true });
          break;

        case "RUN_LIGHTHOUSE_AUDIT":
        case "LIGHTHOUSE_REQUEST":
          try {
            // Check if lighthouse service is available
            if (!this.lighthouseService) {
              throw new Error("LighthouseService not initialized");
            }

            // Use mock results for now (real Lighthouse requires more complex setup)
            const results = this.lighthouseService.getMockResults(
              message.data.url || `tab-${message.data.tabId}`
            );

            console.log("Lighthouse audit completed, sending results");

            // Send result to popup window
            this.sendToPopupWindow("LIGHTHOUSE_RESULT", results);
            sendResponse({ success: true, results: results });
          } catch (error) {
            console.error("Lighthouse audit failed:", error);
            this.sendToPopupWindow("LIGHTHOUSE_RESULT", {
              error: error.message,
            });
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          console.warn("Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Send message to popup window
  async sendToPopupWindow(type, data) {
    try {
      // Send message to all extension contexts (including popup windows)
      chrome.runtime
        .sendMessage({
          type: type,
          data: data,
          target: "gpt-popup",
        })
        .catch(() => {
          // Popup might not be open, ignore error
          console.log("GPT popup not available for message:", type);
        });
    } catch (error) {
      console.warn("Failed to send message to popup window:", error);
    }
  }

  setupContextMenus() {
    try {
      if (chrome.contextMenus) {
        chrome.contextMenus.create({
          id: "gpt-analyze",
          title: "Analyze with GPT",
          contexts: ["selection", "page"],
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
          if (info.menuItemId === "gpt-analyze") {
            this.handleContextMenuClick(info, tab);
          }
        });
      } else {
        this.debugLogger.warn("Context menus API not available");
      }
    } catch (error) {
      this.debugLogger.error("Failed to setup context menus:", error);
    }
  }

  async handleContextMenuClick(info, tab) {
    try {
      const text = info.selectionText || "Analyze this page";

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, {
        type: "ANALYZE_TEXT",
        data: { text, url: tab.url },
      });
    } catch (error) {
      this.debugLogger.error("Context menu error:", error);
    }
  }

  setupDebugger() {
    // Enable debugging for development
    if (process.env.NODE_ENV === "development") {
      chrome.debugger.onEvent.addListener((source, method, params) => {
        this.debugLogger.log("Debugger event:", { source, method, params });
      });
    }
  }

  async getStoredApiKey() {
    const result = await chrome.storage.local.get(["openai_api_key"]);
    return result.openai_api_key || null;
  }

  async storeApiKey(apiKey) {
    await chrome.storage.local.set({ openai_api_key: apiKey });
    // Set API key in GPT service
    if (apiKey && apiKey.trim()) {
      await this.gptService.setApiKey(apiKey);
      this.debugLogger.log("API key configured for GPT service");
    }
  }
}

// Initialize background service
new BackgroundService();
