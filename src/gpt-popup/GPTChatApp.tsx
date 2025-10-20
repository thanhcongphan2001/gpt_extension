import React, { useState, useEffect, useRef } from "react";

interface ChatMessage {
  id: number;
  type: "user" | "assistant" | "error";
  content: string;
  timestamp: Date;
}

interface CurrentPage {
  title?: string;
  url?: string;
  pageText?: string;
  metaDescription?: string;
  headings?: string;
}

interface GPTResponse {
  error?: string;
  content?: string;
  message?: string;
}

const GPTChatApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<CurrentPage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadCurrentPageInfo();
    setupMessageHandlers();

    // Auto-focus input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentPageInfo = async () => {
    try {
      // Request current page info from background script
      const response = await chrome.runtime.sendMessage({
        type: "GET_CURRENT_PAGE",
        target: "background",
      });

      console.log("[GPT-Chat] Page response:", response);

      if (response && response.success && response.data) {
        // Only set if we got a real web page, not extension page
        if (!response.data.url.startsWith("chrome-extension://")) {
          setCurrentPage({
            title: response.data.title,
            url: response.data.url,
          });
          console.log("[GPT-Chat] Loaded current page:", response.data);
        } else {
          console.warn(
            "[GPT-Chat] Got extension page, looking for web page..."
          );
          setCurrentPage(null);
        }
      } else {
        console.warn("[GPT-Chat] Failed to get current page info:", response);
        setCurrentPage(null);
      }
    } catch (error) {
      console.error("[GPT-Chat] Failed to load current page info:", error);
    }
  };

  const setupMessageHandlers = () => {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("[GPT-Chat] Received message:", message);

      if (message.target && message.target !== "gpt-popup") {
        return;
      }

      switch (message.type) {
        case "GPT_RESPONSE":
          console.log("[GPT-Chat] Handling GPT response:", message.data);
          handleGPTResponse(message.data);
          break;
        case "LIGHTHOUSE_RESULT":
          console.log("[GPT-Chat] Received Lighthouse result:", message.data);
          break;
      }
    });
  };

  const handleGPTResponse = (data) => {
    setIsLoading(false);

    if (data.error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "assistant",
          content: data.content || data.message || "No response received",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleDebugCommand = async () => {
    try {
      // Get current page info
      const pageResponse = await chrome.runtime.sendMessage({
        type: "GET_CURRENT_PAGE",
        target: "background",
      });

      const debugInfo = {
        timestamp: new Date().toLocaleString(),
        currentPage: currentPage,
        pageResponse: pageResponse,
        extensionId: chrome.runtime.id,
        userAgent: navigator.userAgent,
      };

      // Add debug message to chat
      const debugMessage = {
        id: Date.now(),
        type: "assistant",
        content: `🔍 **DEBUG INFO**\n\n**Extension ID:** ${
          debugInfo.extensionId
        }\n\n**Current Page:** ${JSON.stringify(
          debugInfo.currentPage,
          null,
          2
        )}\n\n**Page Response:** ${JSON.stringify(
          debugInfo.pageResponse,
          null,
          2
        )}\n\n**Timestamp:** ${debugInfo.timestamp}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, debugMessage]);
      console.log("🔍 Debug Info:", debugInfo);
    } catch (error) {
      console.error("❌ Debug command failed:", error);
      const errorMessage = {
        id: Date.now(),
        type: "assistant",
        content: `❌ **DEBUG ERROR**\n\n${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Check if user is asking for page analysis
      const message = userMessage.content.toLowerCase().trim();

      console.log(message);

      // Check for debug command
      if (message === "debug") {
        await handleDebugCommand();
        return;
      }

      const needsPageContent = message.includes("phân tích");

      // Get current page info with content if needed
      let pageContext = currentPage;
      if (needsPageContent && currentPage) {
        console.log("🔍 Requesting page content...");
        try {
          const pageResponse = await chrome.runtime.sendMessage({
            type: "GET_CURRENT_PAGE",
            data: { includeContent: true },
          });

          console.log("📥 Page response:", pageResponse);

          if (pageResponse.success && pageResponse.data.content) {
            pageContext = {
              ...currentPage,
              pageText: `${pageResponse.data.content.metaDescription} ${pageResponse.data.content.headings} ${pageResponse.data.content.content}`,
              metaDescription: pageResponse.data.content.metaDescription,
              headings: pageResponse.data.content.headings,
            };
            console.log("✅ Page context created:", pageContext);
          } else {
            console.warn("❌ No page content received:", pageResponse);
          }
        } catch (contentError) {
          console.error("❌ Could not get page content:", contentError);
        }
      } else {
        console.log("ℹ️ No page content needed or no current page:", {
          needsPageContent,
          currentPage,
        });
      }

      const response = await chrome.runtime.sendMessage({
        type: "GPT_REQUEST",
        data: {
          message: userMessage.content,
          context: pageContext,
          conversationId: "gpt-popup",
        },
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "error",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    GPT Assistant
                  </h1>
                  <p className="text-indigo-100 text-sm">Powered by OpenAI</p>
                </div>
              </div>
              {currentPage && (
                <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs">🌐</span>
                    <div className="text-sm font-medium truncate text-white">
                      {currentPage.title}
                    </div>
                  </div>
                  <div className="text-xs text-indigo-100 truncate font-mono">
                    {currentPage.url}
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105"
                onClick={clearChat}
                title="Clear chat"
              >
                <span className="text-lg">🗑️</span>
              </button>
              <button
                className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105"
                onClick={() => window.close()}
                title="Close window"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <span className="text-3xl">🤖</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-gray-800">
                  Xin chào! 👋
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Tôi là GPT Assistant, sẵn sàng giúp bạn phân tích trang web
                  hiện tại hoặc trả lời bất kỳ câu hỏi nào.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-100">
                  <span className="text-indigo-600 font-medium">💡 Gợi ý:</span>{" "}
                  "Phân tích trang web này"
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
                  <span className="text-purple-600 font-medium">🔍 Ví dụ:</span>{" "}
                  "Tóm tắt nội dung chính"
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] ${
                message.type === "user" ? "order-2" : "order-1"
              }`}
            >
              <div className="flex items-start space-x-3">
                {message.type !== "user" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm">🤖</span>
                  </div>
                )}
                <div className="flex-1">
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      message.type === "user"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white ml-auto"
                        : message.type === "error"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                  <div
                    className={`text-xs text-gray-500 mt-2 ${
                      message.type === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.type === "user" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">🤖</span>
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-gray-600 text-sm">
                      GPT đang suy nghĩ...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Nhập tin nhắn của bạn... (Enter để gửi, Shift+Enter để xuống dòng)"
                className="w-full resize-none border-2 border-gray-200 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 max-h-32 bg-white/90 backdrop-blur-sm shadow-sm"
                disabled={isLoading}
                rows={1}
              />
              <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                {inputValue.length}/1000
              </div>
            </div>
            <button
              className={`p-3 rounded-2xl font-medium transition-all duration-200 shadow-sm ${
                !inputValue.trim() || isLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:shadow-lg hover:scale-105 active:scale-95"
              }`}
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <span className="text-xl">{isLoading ? "⏳" : "🚀"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>💡 Tip: Shift+Enter để xuống dòng</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>GPT Assistant Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPTChatApp;
