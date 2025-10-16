// GPT Popup Window Script
class GPTPopup {
  constructor() {
    this.isLoading = false;
    this.conversationHistory = [];
    this.init();
  }

  async init() {
    try {
      await this.loadCurrentPageInfo();
      this.setupEventListeners();
      this.setupMessageHandlers();
      console.log("[GPT-Popup] Initialized successfully");
    } catch (error) {
      console.error("[GPT-Popup] Failed to initialize:", error);
    }
  }

  setupEventListeners() {
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    // Auto-resize textarea
    chatInput.addEventListener("input", () => {
      chatInput.style.height = "auto";
      chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
    });

    // Send on Enter (but not Shift+Enter)
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    sendBtn.addEventListener("click", () => this.sendMessage());
  }

  setupMessageHandlers() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("[GPT-Popup] Received message:", message);

      // Only handle messages targeted to gpt-popup
      if (message.target && message.target !== "gpt-popup") {
        return;
      }

      switch (message.type) {
        case "GPT_RESPONSE":
          console.log("[GPT-Popup] Handling GPT response:", message.data);
          this.handleGPTResponse(message.data);
          break;
        case "LIGHTHOUSE_RESULT":
          console.log("[GPT-Popup] Received Lighthouse result:", message.data);
          // Could display lighthouse results in chat if needed
          break;
      }
    });
  }

  async loadCurrentPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab) {
        const currentPageEl = document.getElementById("current-page");
        currentPageEl.textContent = `${tab.title} - ${tab.url}`;
      }
    } catch (error) {
      console.error("[GPT-Popup] Failed to load current page info:", error);
      document.getElementById("current-page").textContent =
        "Unable to load page info";
    }
  }

  async sendMessage() {
    const chatInput = document.getElementById("chat-input");
    const message = chatInput.value.trim();

    if (!message || this.isLoading) return;

    // Add user message to chat
    this.addMessage("user", message);
    chatInput.value = "";
    chatInput.style.height = "auto";

    // Show loading
    this.setLoading(true);

    try {
      // Get current page content for context
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("[GPT-Popup] Sending GPT request:", message);

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: "GPT_REQUEST",
        data: {
          message: message,
          url: tab?.url,
          title: tab?.title,
        },
      });

      console.log("[GPT-Popup] GPT request response:", response);

      // Handle immediate response if available
      if (response && !response.success) {
        this.handleGPTResponse({ error: response.error });
      }
    } catch (error) {
      console.error("[GPT-Popup] Failed to send message:", error);
      this.addMessage("error", `Failed to send message: ${error.message}`);
      this.setLoading(false);
    }
  }

  handleGPTResponse(data) {
    this.setLoading(false);

    if (data.error) {
      this.addMessage("error", data.error);
    } else if (data.content) {
      this.addMessage("assistant", data.content);
    } else {
      this.addMessage("error", "Received empty response from GPT");
    }
  }

  addMessage(type, content) {
    const messagesContainer = document.getElementById("chat-messages");

    // Remove empty state if it exists
    const emptyState = messagesContainer.querySelector(".empty-state");
    if (emptyState) {
      emptyState.remove();
    }

    // Create message element
    const messageEl = document.createElement("div");
    messageEl.className = `message ${type}`;

    const contentEl = document.createElement("div");
    contentEl.className = "message-content";
    contentEl.textContent = content;

    const timeEl = document.createElement("div");
    timeEl.className = "message-time";
    timeEl.textContent = new Date().toLocaleTimeString();

    messageEl.appendChild(contentEl);
    messageEl.appendChild(timeEl);

    messagesContainer.appendChild(messageEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Store in conversation history
    this.conversationHistory.push({
      type,
      content,
      timestamp: Date.now(),
    });
  }

  setLoading(loading) {
    this.isLoading = loading;
    const sendBtn = document.getElementById("send-btn");
    const chatInput = document.getElementById("chat-input");

    sendBtn.disabled = loading;
    chatInput.disabled = loading;

    if (loading) {
      this.addLoadingMessage();
    } else {
      this.removeLoadingMessage();
    }
  }

  addLoadingMessage() {
    const messagesContainer = document.getElementById("chat-messages");

    const loadingEl = document.createElement("div");
    loadingEl.className = "message loading-message";
    loadingEl.id = "loading-message";

    loadingEl.innerHTML = `
      <div class="message-content">
        <span>GPT is thinking</span>
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    messagesContainer.appendChild(loadingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  removeLoadingMessage() {
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
      loadingMessage.remove();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GPTPopup();
});
