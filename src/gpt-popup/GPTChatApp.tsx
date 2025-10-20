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

  const getDebugInfo = async () => {
    console.log("🔍 Getting debug info...");

    try {
      // Step 1: First setup console logging on the page
      console.log("📝 Setting up console logging...");
      await chrome.runtime.sendMessage({
        type: "SETUP_CONSOLE_LOGGING",
        target: "background",
      });

      // Step 2: Wait a bit for logs to be captured
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Get current page info with console logs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timeout after 8 seconds")),
          8000
        );
      });

      let pageResponse = null;
      try {
        pageResponse = await Promise.race([
          chrome.runtime.sendMessage({
            type: "GET_CURRENT_PAGE",
            target: "background",
            data: { includeLogs: true }, // Request console logs
          }),
          timeoutPromise,
        ]);
        console.log("✅ Page response received:", pageResponse);
      } catch (pageError) {
        console.warn("⚠️ Failed to get page response:", pageError);
        pageResponse = { error: pageError.message };
      }

      return {
        timestamp: new Date().toLocaleString(),
        currentPage: currentPage,
        pageResponse: pageResponse,
        extensionId: chrome.runtime.id,
        userAgent: navigator.userAgent.substring(0, 100) + "...",
      };
    } catch (error) {
      console.error("❌ Failed to get debug info:", error);
      return { error: error.message };
    }
  };

  const handleDebugAnalysis = async () => {
    console.log("🔍 Debug analysis started...");

    try {
      // Get debug info including console logs
      const debugInfo = await getDebugInfo();

      // Format console logs for GPT analysis
      let logsForGPT = "No console logs available";
      if (debugInfo.pageResponse?.data?.logs) {
        const logs = debugInfo.pageResponse.data.logs;
        console.log("Logs:", debugInfo);
        if (logs.error) {
          logsForGPT = `Console logs error: ${logs.error}`;
        } else if (logs.logs && logs.logs.length > 0) {
          logsForGPT = logs.logs
            .map(
              (log) =>
                `[${log.timestamp || "unknown"}] ${log.type || "log"}: ${
                  log.args || log.message || "empty"
                }`
            )
            .join("\n");
          if (logs.note) {
            logsForGPT += `\n\nNote: ${logs.note}`;
          }
        } else {
          logsForGPT = "No console messages found in current session";
        }
      }

      // Format detailed page analysis
      let pageAnalysisForGPT = "No detailed page analysis available";
      console.log(
        "🔍 Page Analysis Data:",
        debugInfo.pageResponse?.data?.pageAnalysis
      );
      if (debugInfo.pageResponse?.data?.pageAnalysis) {
        const analysis = debugInfo.pageResponse.data.pageAnalysis;

        let analysisText = `**Page Info:**
- Title: ${analysis.pageInfo?.title || "Unknown"}
- URL: ${analysis.pageInfo?.url || "Unknown"}
- Total Images: ${analysis.pageInfo?.totalImages || 0}
- Total Scripts: ${analysis.pageInfo?.totalScripts || 0}
- Total Links: ${analysis.pageInfo?.totalLinks || 0}

`;

        // Broken Images
        if (analysis.brokenImages && analysis.brokenImages.length > 0) {
          analysisText += `**Broken Images (${analysis.brokenImages.length}):**\n`;
          analysis.brokenImages.forEach((img) => {
            analysisText += `- Image #${img.index}: ${img.src}\n`;
            analysisText += `  Alt text: "${img.alt}"\n`;
            analysisText += `  Class: "${img.className}"\n`;
            analysisText += `  ID: "${img.id}"\n`;
            analysisText += `  Parent: ${img.parentElement}\n\n`;
          });
        } else {
          analysisText += "**Broken Images:** None found\n\n";
        }

        // CSS Errors
        if (analysis.cssErrors && analysis.cssErrors.length > 0) {
          analysisText += `**CSS Errors (${analysis.cssErrors.length}):**\n`;
          analysis.cssErrors.forEach((css) => {
            analysisText += `- Stylesheet #${css.index}: ${css.href}\n`;
            analysisText += `  Error: ${css.error}\n\n`;
          });
        }

        // JavaScript Errors
        if (analysis.jsErrors && analysis.jsErrors.length > 0) {
          analysisText += `**JavaScript Errors (${analysis.jsErrors.length}):**\n`;
          analysis.jsErrors.forEach((js) => {
            analysisText += `- Error #${js.index}: ${js.message}\n`;
            analysisText += `  Time: ${js.timestamp}\n`;
            analysisText += `  Type: ${js.type}\n\n`;
          });
        }

        // Network Issues
        if (analysis.networkIssues && analysis.networkIssues.length > 0) {
          analysisText += `**Network Issues (${analysis.networkIssues.length}):**\n`;
          analysis.networkIssues.forEach((net) => {
            analysisText += `- ${net.type} #${net.index}: ${net.src}\n`;
            analysisText += `  Error: ${net.error}\n\n`;
          });
        }

        // Performance Issues
        if (
          analysis.performanceIssues &&
          analysis.performanceIssues.length > 0
        ) {
          analysisText += `**Performance Issues (${analysis.performanceIssues.length}):**\n`;
          analysis.performanceIssues.forEach((perf) => {
            analysisText += `- ${perf.description}\n`;
            if (perf.resource) analysisText += `  Resource: ${perf.resource}\n`;
            if (perf.duration)
              analysisText += `  Duration: ${perf.duration}ms\n\n`;
          });
        }

        // Accessibility Issues
        if (
          analysis.accessibilityIssues &&
          analysis.accessibilityIssues.length > 0
        ) {
          analysisText += `**Accessibility Issues (${analysis.accessibilityIssues.length}):**\n`;
          analysis.accessibilityIssues.forEach((acc) => {
            analysisText += `- ${acc.description}\n`;
            analysisText += `  Type: ${acc.type}\n\n`;
          });
        }

        // Missing Resources
        if (analysis.missingResources && analysis.missingResources.length > 0) {
          analysisText += `**Missing Resources (${analysis.missingResources.length}):**\n`;
          analysis.missingResources.forEach((res) => {
            analysisText += `- ${res.description}\n`;
            analysisText += `  Type: ${res.type}\n\n`;
          });
        }

        pageAnalysisForGPT = analysisText;
      }

      // Create context for GPT analysis
      const debugContext = {
        url: debugInfo.currentPage?.url || "Unknown",
        title: debugInfo.currentPage?.title || "Unknown",
        extensionId: debugInfo.extensionId,
        consoleLogs: logsForGPT,
        pageAnalysis: pageAnalysisForGPT,
        timestamp: debugInfo.timestamp,
        pageContent: debugInfo.pageResponse?.data?.content || null,
      };

      // Send to GPT for analysis
      const { GPTService } = await import("../services/gpt-service.js");
      const gptService = new GPTService();
      const apiKey = await chrome.runtime.sendMessage({
        type: "GET_API_KEY",
        target: "background",
      });

      if (apiKey && apiKey.success && apiKey.data) {
        console.log("✅ API key found, setting up GPT service...");
        await gptService.setApiKey(apiKey.data);

        const analysisPrompt = `Phân tích debug info của Chrome extension này:

**Trang web hiện tại:** ${debugContext.title} (${debugContext.url})
**Extension ID:** ${debugContext.extensionId}
**Thời gian:** ${debugContext.timestamp}

**Console Logs:**
${debugContext.consoleLogs}

**Page Analysis:**
${debugContext.pageAnalysis}

Hãy phân tích CHI TIẾT:
1. Có lỗi gì trong console logs không? (Liệt kê cụ thể từng lỗi)
2. Trang web có hoạt động bình thường không?
3. Có warning hoặc vấn đề gì cần chú ý? (Nêu rõ vấn đề cụ thể)
4. Nếu có hình ảnh bị hỏng, hãy CHỈ RA CHÍNH XÁC hình ảnh nào (URL đầy đủ, alt text, class, ID)
5. Nếu có lỗi JavaScript, hãy CHỈ RA file và dòng lỗi cụ thể
6. Nếu có network errors, hãy CHỈ RA URL và status code cụ thể
7. Đánh giá tổng quan về trạng thái trang web

QUAN TRỌNG:
- Hãy trả lời CHI TIẾT và CỤ THỂ, không chỉ nói chung chung
- Khi user hỏi về hình ảnh bị hỏng, hãy đưa ra thông tin chi tiết từ Page Analysis
- Nhớ thông tin này để trả lời các câu hỏi tiếp theo

Trả lời bằng tiếng Việt, chi tiết và cụ thể.`;

        console.log("🤖 Sending request to GPT...");
        console.log("📝 Debug Context:", debugContext);
        console.log("📝 Full Prompt:", analysisPrompt);
        console.log(
          "📝 Prompt Preview:",
          analysisPrompt.substring(0, 500) + "..."
        );

        const response = await gptService.sendRequest({
          message: analysisPrompt,
          context: debugContext,
        });

        console.log("📨 GPT Response:", response);
        console.log("📨 Response success:", response.success);
        console.log("📨 Response error:", response.error);
        console.log("📨 Response data:", response.data);

        // Handle different response formats
        let content = null;
        if (response.success && response.data && response.data.content) {
          // Format: {success: true, data: {content: "..."}}
          content = response.data.content;
        } else if (response.content) {
          // Format: {content: "...", usage: {...}, model: "..."}
          content = response.content;
        }

        if (content) {
          const analysisMessage = {
            id: Date.now(),
            type: "assistant",
            content: content,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, analysisMessage]);
        } else {
          console.error("❌ GPT service returned unexpected format:", {
            success: response.success,
            error: response.error,
            data: response.data,
            content: response.content,
            fullResponse: response,
          });
          throw new Error(response.error || "GPT response format error");
        }
      } else {
        console.error("❌ API key not found:", apiKey);
        throw new Error("API key not configured");
      }
    } catch (error) {
      console.error("❌ Debug analysis failed:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      const errorMessage = {
        id: Date.now(),
        type: "assistant",
        content: `❌ **Lỗi phân tích debug**\n\n**Chi tiết lỗi:** ${
          error.message
        }\n\n**Debug info:**\n- Extension ID: ${
          chrome.runtime.id
        }\n- Timestamp: ${new Date().toLocaleString()}\n\nVui lòng kiểm tra Console (F12) để xem chi tiết và thử lại.`,
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

      // Check for debug command - send logs to GPT for analysis
      if (message === "debug") {
        await handleDebugAnalysis();
        setIsLoading(false);
        return;
      }

      const needsPageContent = message.includes("phân tích");

      // Get current page info with content if needed
      let pageContext = currentPage;
      if (needsPageContent && currentPage) {
        console.log(
          "🔍 User wants page analysis, requesting page content (NOT console logs)..."
        );
        try {
          const pageResponse = await chrome.runtime.sendMessage({
            type: "GET_CURRENT_PAGE",
            data: {
              includeContent: true,
              includeLogs: false, // Explicitly exclude logs for page analysis
            },
          });

          console.log("📥 Page content response:", pageResponse);

          if (pageResponse.success && pageResponse.data.content) {
            pageContext = {
              ...currentPage,
              pageText: `${pageResponse.data.content.metaDescription || ""} ${
                pageResponse.data.content.headings || ""
              } ${pageResponse.data.content.content || ""}`,
              metaDescription: pageResponse.data.content.metaDescription,
              headings: pageResponse.data.content.headings,
              fullContent: pageResponse.data.content.content,
            };
            console.log("✅ Page context created for analysis:", pageContext);
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
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <span className="text-lg sm:text-xl">🤖</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                    GPT Assistant
                  </h1>
                  <p className="text-indigo-100 text-xs sm:text-sm">
                    Powered by OpenAI
                  </p>
                </div>
              </div>
              {currentPage && (
                <div className="mt-2 sm:mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/20">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs flex-shrink-0">🌐</span>
                    <div className="text-xs sm:text-sm font-medium truncate text-white">
                      {currentPage.title}
                    </div>
                  </div>
                  <div className="text-xs text-indigo-100 truncate font-mono">
                    {currentPage.url}
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
              <button
                className="p-2 sm:p-3 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105"
                onClick={clearChat}
                title="Clear chat"
              >
                <span className="text-sm sm:text-lg">🗑️</span>
              </button>
              <button
                className="p-2 sm:p-3 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105"
                onClick={() => window.close()}
                title="Close window"
              >
                <span className="text-sm sm:text-lg">✕</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 sm:space-y-6 max-w-md mx-auto px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <span className="text-2xl sm:text-3xl">🤖</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Xin chào! 👋
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
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
                  "debug"
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
              className={`max-w-[85%] sm:max-w-[80%] ${
                message.type === "user" ? "order-2" : "order-1"
              }`}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                {message.type !== "user" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs sm:text-sm">🤖</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className={`rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm ${
                      message.type === "user"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white ml-auto"
                        : message.type === "error"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                      {message.content}
                    </div>
                  </div>
                  <div
                    className={`text-xs text-gray-500 mt-1 sm:mt-2 ${
                      message.type === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
                {message.type === "user" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs sm:text-sm">👤</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[80%]">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs sm:text-sm">🤖</span>
                </div>
                <div className="bg-white rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-gray-600 text-xs sm:text-sm">
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

      <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm p-3 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2 sm:space-x-4">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Nhập tin nhắn... (Enter để gửi)"
                className="w-full resize-none border-2 border-gray-200 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 pr-8 sm:pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 max-h-24 sm:max-h-32 bg-white/90 backdrop-blur-sm shadow-sm text-sm sm:text-base"
                disabled={isLoading}
                rows={1}
              />
              <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 text-xs text-gray-400">
                {inputValue.length}/1000
              </div>
            </div>
            <button
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl font-medium transition-all duration-200 shadow-sm flex-shrink-0 ${
                !inputValue.trim() || isLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:shadow-lg hover:scale-105 active:scale-95"
              }`}
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <span className="text-lg sm:text-xl">
                {isLoading ? "⏳" : "🚀"}
              </span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 sm:mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline">
                💡 Tip: Shift+Enter để xuống dòng
              </span>
              <span className="sm:hidden">💡 Shift+Enter xuống dòng</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">GPT Assistant Online</span>
              <span className="sm:hidden">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPTChatApp;
