// GPT Service for OpenAI API integration
export class GPTService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = "https://api.openai.com/v1";
    this.model = "gpt-3.5-turbo";
    this.maxTokens = 1000;
    this.temperature = 0.7;
    this.conversationHistory = new Map(); // Store conversations by tab ID
  }

  async initialize() {
    try {
      this.apiKey = await this.getStoredApiKey();
      return !!this.apiKey;
    } catch (error) {
      console.error("Failed to initialize GPT service:", error);
      return false;
    }
  }

  async getStoredApiKey() {
    const result = await chrome.storage.local.get(["openai_api_key"]);
    return result.openai_api_key || null;
  }

  async setApiKey(apiKey) {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ openai_api_key: apiKey });
  }

  async sendRequest(requestData) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { message, context, conversationId = "default" } = requestData;

    try {
      // Build conversation context
      const messages = this.buildMessages(message, context, conversationId);

      // Make API request
      const response = await this.makeApiRequest(messages);

      // Store conversation history
      this.updateConversationHistory(conversationId, message, response.content);

      return {
        content: response.content,
        usage: response.usage,
        model: this.model,
      };
    } catch (error) {
      console.error("GPT API request failed:", error);
      throw new Error(`GPT request failed: ${error.message}`);
    }
  }

  buildMessages(userMessage, context, conversationId) {
    const messages = [];

    // System message with context
    const systemMessage = this.buildSystemMessage(context);
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage,
      });
    }

    // Add conversation history
    const history = this.conversationHistory.get(conversationId) || [];
    messages.push(...history);

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Limit message history to prevent token overflow
    return this.limitMessageHistory(messages);
  }

  buildSystemMessage(context) {
    if (!context) return null;

    let systemContent =
      "You are a helpful AI assistant integrated into a Chrome browser extension. Always respond in Vietnamese (tiếng Việt) unless the user specifically requests another language. ";

    // Check if this is a debug analysis request
    if (context.consoleLogs || context.pageAnalysis) {
      systemContent += `You are performing a debug analysis of a webpage. You have access to:
- Console logs from the browser
- Detailed page analysis including broken images, CSS errors, JavaScript errors, performance issues, etc.
- Page information and statistics

Your task is to analyze this technical information and provide detailed, specific insights about any issues found. Always be concrete and specific in your analysis, mentioning exact URLs, error messages, and technical details. `;
    }

    if (context.url) {
      systemContent += `The user is currently on the webpage: ${context.url}. `;
    }

    if (context.title) {
      systemContent += `The page title is: "${context.title}". `;
    }

    if (context.selectedText) {
      systemContent += `The user has selected this text: "${context.selectedText}". `;
    }

    if (context.pageText) {
      systemContent += `Here's some content from the current page: "${context.pageText.substring(
        0,
        500
      )}...". `;
    }

    systemContent +=
      "Please provide helpful, accurate, and contextually relevant responses in Vietnamese. Keep responses concise but informative.";

    return systemContent;
  }

  limitMessageHistory(messages, maxMessages = 10) {
    // Keep system message and limit conversation history
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    if (conversationMessages.length > maxMessages) {
      const recentMessages = conversationMessages.slice(-maxMessages);
      return [...systemMessages, ...recentMessages];
    }

    return messages;
  }

  async makeApiRequest(messages) {
    const requestBody = {
      model: this.model,
      messages: messages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenAI API");
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  }

  updateConversationHistory(conversationId, userMessage, assistantResponse) {
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, []);
    }

    const history = this.conversationHistory.get(conversationId);

    // Add user message and assistant response
    history.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantResponse }
    );

    // Limit history size
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    this.conversationHistory.set(conversationId, history);
  }

  clearConversationHistory(conversationId = null) {
    if (conversationId) {
      this.conversationHistory.delete(conversationId);
    } else {
      this.conversationHistory.clear();
    }
  }

  getConversationHistory(conversationId) {
    return this.conversationHistory.get(conversationId) || [];
  }

  // Test API connection
  async testConnection() {
    if (!this.apiKey) {
      throw new Error("API key not configured");
    }

    try {
      const response = await this.makeApiRequest([
        {
          role: "user",
          content: 'Hello, please respond with "Connection successful"',
        },
      ]);

      return {
        success: true,
        message: "API connection successful",
        response: response.content,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Get available models
  async getAvailableModels() {
    if (!this.apiKey) {
      throw new Error("API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data
        .filter((model) => model.id.includes("gpt"))
        .map((model) => model.id);
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return ["gpt-3.5-turbo", "gpt-4"]; // Fallback to common models
    }
  }

  // Update settings
  updateSettings(settings) {
    if (settings.model) this.model = settings.model;
    if (settings.maxTokens) this.maxTokens = settings.maxTokens;
    if (settings.temperature !== undefined)
      this.temperature = settings.temperature;
  }

  // Get current settings
  getSettings() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      hasApiKey: !!this.apiKey,
    };
  }

  // Stream response (for future implementation)
  async sendStreamRequest(requestData, onChunk) {
    // Implementation for streaming responses
    // This would be useful for real-time response display
    throw new Error("Streaming not yet implemented");
  }

  // Analyze webpage content
  async analyzeWebpage(url, content) {
    const analysisPrompt = `Please analyze this webpage and provide insights:
    
URL: ${url}
Content: ${content.substring(0, 2000)}...

Please provide:
1. A brief summary of the page content
2. Key topics or themes
3. Any notable information or insights
4. Suggestions for questions I might ask about this content`;

    return await this.sendRequest({
      message: analysisPrompt,
      context: { url, pageText: content },
    });
  }

  // Extract and summarize selected text
  async summarizeText(text, context = {}) {
    const prompt = `Please provide a concise summary of the following text:

"${text}"

Focus on the main points and key information.`;

    return await this.sendRequest({
      message: prompt,
      context: { ...context, selectedText: text },
    });
  }
}
