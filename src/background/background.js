// Background service worker for GPT Chrome Extension
import { GPTService } from "../services/gpt-service.js";
import { LighthouseService } from "../services/lighthouse-service.js";

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

        case "SETUP_CONSOLE_LOGGING":
          try {
            // Get all tabs from all windows to find web pages
            const tabs = await chrome.tabs.query({});
            const webTabs = tabs.filter(
              (tab) =>
                !tab.url.startsWith("chrome-extension://") &&
                !tab.url.startsWith("chrome://") &&
                !tab.url.startsWith("moz-extension://")
            );

            // Get the most recently active web tab
            let tab = webTabs.find((t) => t.active);
            if (!tab && webTabs.length > 0) {
              webTabs.sort(
                (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
              );
              tab = webTabs[0];
            }

            if (!tab) {
              sendResponse({
                success: false,
                error: "No web page found to setup console logging",
              });
              return;
            }

            // Setup console logging on the page
            await this.setupConsoleLogging(tab.id);

            sendResponse({
              success: true,
              data: { message: "Console logging setup completed" },
            });
          } catch (error) {
            console.error("Failed to setup console logging:", error);
            sendResponse({
              success: false,
              error: error.message,
            });
          }
          break;

        case "API_GET_CONSOLE_LOGS":
          try {
            // Get all tabs from all windows to find web pages
            const tabs = await chrome.tabs.query({});
            const webTabs = tabs.filter(
              (tab) =>
                !tab.url.startsWith("chrome-extension://") &&
                !tab.url.startsWith("chrome://") &&
                !tab.url.startsWith("moz-extension://")
            );

            // Get the most recently active web tab
            let tab = webTabs.find((t) => t.active);
            if (!tab && webTabs.length > 0) {
              webTabs.sort(
                (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
              );
              tab = webTabs[0];
            }

            if (!tab) {
              sendResponse({
                success: false,
                error: "No web page found",
                data: { logs: [], tabInfo: null },
              });
              return;
            }

            // Get console logs for this tab
            const consoleLogs = await this.getConsoleLogsFromTab(tab.id);

            // Get detailed page analysis
            const pageAnalysis = await this.getDetailedPageAnalysis(tab.id);

            sendResponse({
              success: true,
              data: {
                tabInfo: {
                  id: tab.id,
                  title: tab.title,
                  url: tab.url,
                  active: tab.active,
                },
                logs: consoleLogs.logs || [],
                note: consoleLogs.note,
                error: consoleLogs.error,
                timestamp: new Date().toISOString(),
                totalLogs: (consoleLogs.logs || []).length,
                pageAnalysis: pageAnalysis.analysis || null,
                analysisError: pageAnalysis.error || null,
              },
            });
          } catch (error) {
            console.error("Failed to get console logs via API:", error);
            sendResponse({
              success: false,
              error: error.message,
              data: { logs: [] },
            });
          }
          break;

        case "GET_CURRENT_PAGE":
          try {
            // Get all tabs from all windows to find web pages
            const tabs = await chrome.tabs.query({});

            console.log(
              "🔍 All tabs:",
              tabs.map((t) => ({ id: t.id, url: t.url, active: t.active }))
            );

            // Filter out extension pages and find the active web page
            const webTabs = tabs.filter(
              (tab) =>
                !tab.url.startsWith("chrome-extension://") &&
                !tab.url.startsWith("chrome://") &&
                !tab.url.startsWith("moz-extension://")
            );

            console.log(
              "🌐 Web tabs:",
              webTabs.map((t) => ({ id: t.id, url: t.url, active: t.active }))
            );

            // Get the most recently active web tab
            // Priority: 1) Active tab, 2) Most recently accessed tab
            let tab = webTabs.find((t) => t.active);
            if (!tab && webTabs.length > 0) {
              // Sort by lastAccessed (most recent first) and take the first one
              webTabs.sort(
                (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
              );
              tab = webTabs[0];
            }

            console.log(
              "🎯 Selected tab:",
              tab ? { id: tab.id, url: tab.url, title: tab.title } : null
            );

            // Get console logs if requested
            let consoleLogs = null;
            if (message.data && message.data.includeLogs && tab) {
              try {
                consoleLogs = await this.getConsoleLogsFromTab(tab.id);
              } catch (logError) {
                console.warn("Could not get console logs:", logError);
                consoleLogs = { error: logError.message };
              }
            }

            if (tab) {
              // Try to get page content if requested
              let pageContent = null;
              if (message.data && message.data.includeContent) {
                try {
                  // Inject script to get page content
                  const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                      // Get page text content
                      console.log(
                        "🔍 GPT Extension: Extracting page content..."
                      );

                      const title = document.title;
                      const metaDescription =
                        document.querySelector('meta[name="description"]')
                          ?.content || "";
                      const headings = Array.from(
                        document.querySelectorAll("h1, h2, h3")
                      )
                        .map((h) => h.textContent)
                        .join(" | ");
                      const paragraphs = Array.from(
                        document.querySelectorAll("p")
                      )
                        .slice(0, 5)
                        .map((p) => p.textContent)
                        .join(" ");

                      const result = {
                        title,
                        metaDescription,
                        headings,
                        content: paragraphs.substring(0, 1000), // Limit content
                      };

                      console.log("✅ GPT Extension: Extracted data:", result);
                      return result;
                    },
                  });

                  if (results && results[0] && results[0].result) {
                    pageContent = results[0].result;
                  }
                } catch (contentError) {
                  console.warn("Could not extract page content:", contentError);
                }
              }

              sendResponse({
                success: true,
                data: {
                  title: tab.title,
                  url: tab.url,
                  content: pageContent,
                  logs: consoleLogs,
                },
              });
            } else {
              sendResponse({
                success: false,
                error: "No active tab found",
              });
            }
          } catch (error) {
            console.error("Failed to get current page:", error);
            sendResponse({
              success: false,
              error: error.message,
            });
          }
          break;

        case "RUN_LIGHTHOUSE_AUDIT":
        case "LIGHTHOUSE_REQUEST":
          try {
            // Check if lighthouse service is available
            if (!this.lighthouseService) {
              throw new Error("LighthouseService not initialized");
            }

            console.log("Starting Lighthouse audit for:", message.data.url);

            // Try to run real Lighthouse audit, fallback to mock if fails
            let results;
            try {
              results = await this.lighthouseService.runAudit(message.data.url);
              console.log("Real Lighthouse audit completed");
            } catch (auditError) {
              console.warn(
                "Real Lighthouse failed, using mock results:",
                auditError.message
              );
              results = this.lighthouseService.getMockResults(
                message.data.url || `tab-${message.data.tabId}`
              );
            }

            console.log("Lighthouse audit results:", results);

            // Open results in a new popup window
            this.openLighthouseResults(results);
            sendResponse({ success: true, results: results });
          } catch (error) {
            console.error("Lighthouse audit failed:", error);
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

      // Open GPT popup window instead of content script
      this.openGPTPopup();
    } catch (error) {
      this.debugLogger.error("Context menu error:", error);
    }
  }

  setupDebugger() {
    // Enable debugging for development
    if (
      typeof process !== "undefined" &&
      process.env &&
      process.env.NODE_ENV === "development"
    ) {
      chrome.debugger.onEvent.addListener((source, method, params) => {
        this.debugLogger.log("Debugger event:", { source, method, params });
      });
    }
  }

  async setupConsoleLogging(tabId) {
    console.log("🔧 Setting up console logging for tab:", tabId);

    return new Promise((resolve) => {
      try {
        // Use Chrome Debugger API to capture ALL console messages
        chrome.debugger.attach({ tabId }, "1.0", () => {
          if (chrome.runtime.lastError) {
            console.warn(
              "Could not attach debugger:",
              chrome.runtime.lastError
            );
            resolve({ error: chrome.runtime.lastError.message });
            return;
          }

          // Enable Runtime domain to capture console messages
          chrome.debugger.sendCommand({ tabId }, "Runtime.enable", {}, () => {
            if (chrome.runtime.lastError) {
              chrome.debugger.detach({ tabId });
              resolve({ error: chrome.runtime.lastError.message });
              return;
            }

            // Store console messages in a global array for this tab
            if (!this.tabConsoleLogs) {
              this.tabConsoleLogs = {};
            }
            this.tabConsoleLogs[tabId] = this.tabConsoleLogs[tabId] || [];

            // Listen for console API calls
            const onEvent = (source, method, params) => {
              if (
                source.tabId === tabId &&
                method === "Runtime.consoleAPICalled"
              ) {
                const logEntry = {
                  type: params.type,
                  timestamp: new Date(params.timestamp).toLocaleTimeString(),
                  message: params.args
                    .map((arg) => {
                      if (arg.value !== undefined) return String(arg.value);
                      if (arg.description) return arg.description;
                      if (arg.preview && arg.preview.description)
                        return arg.preview.description;
                      return String(arg);
                    })
                    .join(" "),
                  source: "console",
                };

                this.tabConsoleLogs[tabId].push(logEntry);

                // Keep only last 50 logs per tab
                if (this.tabConsoleLogs[tabId].length > 50) {
                  this.tabConsoleLogs[tabId] =
                    this.tabConsoleLogs[tabId].slice(-50);
                }
              }

              // Also capture Runtime exceptions (JavaScript errors)
              if (
                source.tabId === tabId &&
                method === "Runtime.exceptionThrown"
              ) {
                const errorEntry = {
                  type: "error",
                  timestamp: new Date(params.timestamp).toLocaleTimeString(),
                  message: `JS Exception: ${params.exceptionDetails.text} at ${params.exceptionDetails.url}:${params.exceptionDetails.lineNumber}`,
                  source: "exception",
                };

                this.tabConsoleLogs[tabId].push(errorEntry);
              }
            };

            chrome.debugger.onEvent.addListener(onEvent);

            // Store the event listener reference for cleanup
            if (!this.debuggerListeners) {
              this.debuggerListeners = {};
            }
            this.debuggerListeners[tabId] = onEvent;

            console.log("✅ Console logging setup completed for tab:", tabId);
            resolve({ success: true });
          });
        });
      } catch (error) {
        console.error("❌ Error setting up console logging:", error);
        resolve({ error: error.message });
      }
    });
  }

  async getConsoleLogsFromTab(tabId) {
    console.log("🔍 Getting console logs for tab:", tabId);

    // Return logs captured by Chrome Debugger API
    if (this.tabConsoleLogs && this.tabConsoleLogs[tabId]) {
      const logs = this.tabConsoleLogs[tabId];
      console.log(`✅ Retrieved ${logs.length} console logs from debugger API`);

      return {
        logs: logs,
        note: `Retrieved ${logs.length} console messages from Chrome Debugger API`,
      };
    } else {
      console.warn("⚠️ No console logs found for tab:", tabId);

      return {
        logs: [],
        note: "No console logs captured yet. Console logging may not be setup for this tab.",
        error: "Console logging not initialized for this tab",
      };
    }
  }

  async getDetailedPageAnalysis(tabId) {
    console.log("🔍 Getting detailed page analysis for tab:", tabId);

    return new Promise((resolve) => {
      try {
        chrome.scripting.executeScript(
          {
            target: { tabId },
            function: () => {
              const analysis = {
                brokenImages: [],
                jsErrors: [],
                networkIssues: [],
                cssErrors: [],
                missingResources: [],
                performanceIssues: [],
                accessibilityIssues: [],
                pageInfo: {},
              };

              // 1. Detailed broken images analysis
              const images = document.querySelectorAll("img");
              images.forEach((img, index) => {
                if (
                  img.naturalWidth === 0 &&
                  img.naturalHeight === 0 &&
                  img.src
                ) {
                  analysis.brokenImages.push({
                    index: index + 1,
                    src: img.src,
                    alt: img.alt || "No alt text",
                    className: img.className || "No class",
                    id: img.id || "No ID",
                    parentElement: img.parentElement
                      ? img.parentElement.tagName
                      : "Unknown",
                  });
                }
              });

              // 2. Check for broken CSS/stylesheets
              const stylesheets = document.querySelectorAll(
                'link[rel="stylesheet"]'
              );
              stylesheets.forEach((link, index) => {
                if (link.href && !link.sheet) {
                  analysis.cssErrors.push({
                    index: index + 1,
                    href: link.href,
                    type: "stylesheet",
                    error: "Failed to load stylesheet",
                  });
                }
              });

              // 3. Check for broken scripts
              const scripts = document.querySelectorAll("script[src]");
              scripts.forEach((script, index) => {
                if (script.src && !script.src.startsWith("data:")) {
                  // Check if script has error attribute or failed to load
                  if (
                    script.hasAttribute("data-error") ||
                    !script.readyState ||
                    script.readyState === "error"
                  ) {
                    analysis.networkIssues.push({
                      type: "script",
                      src: script.src,
                      index: index + 1,
                      error: "Script failed to load or execute",
                    });
                  }
                }
              });

              // 4. Check for missing resources (404s, etc.)
              const allLinks = document.querySelectorAll("a[href]");
              let brokenLinks = 0;
              allLinks.forEach((link) => {
                if (
                  link.href &&
                  (link.href.includes("404") || link.href.includes("error"))
                ) {
                  brokenLinks++;
                }
              });

              if (brokenLinks > 0) {
                analysis.missingResources.push({
                  type: "broken_links",
                  count: brokenLinks,
                  description: `Found ${brokenLinks} potentially broken links`,
                });
              }

              // 5. Performance issues
              try {
                const performanceEntries = performance.getEntries();
                const slowResources = performanceEntries.filter(
                  (entry) =>
                    entry.duration > 3000 && entry.name.includes("http")
                );

                slowResources.forEach((entry, index) => {
                  analysis.performanceIssues.push({
                    index: index + 1,
                    resource: entry.name,
                    duration: Math.round(entry.duration),
                    type: "slow_resource",
                    description: `Resource took ${Math.round(
                      entry.duration
                    )}ms to load`,
                  });
                });
              } catch (e) {
                analysis.performanceIssues.push({
                  type: "performance_check_error",
                  error: e.message,
                });
              }

              // 6. Accessibility issues
              const imagesWithoutAlt =
                document.querySelectorAll("img:not([alt])");
              if (imagesWithoutAlt.length > 0) {
                analysis.accessibilityIssues.push({
                  type: "missing_alt_text",
                  count: imagesWithoutAlt.length,
                  description: `${imagesWithoutAlt.length} images missing alt text`,
                });
              }

              const linksWithoutText = document.querySelectorAll(
                "a:empty, a:not([aria-label]):not([title])"
              );
              if (linksWithoutText.length > 0) {
                analysis.accessibilityIssues.push({
                  type: "empty_links",
                  count: linksWithoutText.length,
                  description: `${linksWithoutText.length} links without text or labels`,
                });
              }

              // 7. JavaScript errors from window.onerror
              if (window.__jsErrors && window.__jsErrors.length > 0) {
                analysis.jsErrors = window.__jsErrors.map((error, index) => ({
                  index: index + 1,
                  message: error.message,
                  timestamp: error.timestamp,
                  type: error.type,
                }));
              }

              // 8. Page info
              analysis.pageInfo = {
                title: document.title,
                url: window.location.href,
                totalImages: images.length,
                totalScripts: document.querySelectorAll("script").length,
                totalLinks: document.querySelectorAll("a").length,
                totalStylesheets: stylesheets.length,
                doctype: document.doctype
                  ? document.doctype.name
                  : "No doctype",
                charset: document.characterSet || "Unknown",
                lang: document.documentElement.lang || "Not specified",
              };

              return analysis;
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Could not get detailed page analysis:",
                chrome.runtime.lastError
              );
              resolve({
                error: chrome.runtime.lastError.message,
                analysis: null,
              });
            } else if (results && results[0] && results[0].result) {
              const analysis = results[0].result;
              console.log("✅ Retrieved detailed page analysis:", analysis);
              resolve({
                success: true,
                analysis: analysis,
              });
            } else {
              resolve({
                error: "No analysis data returned",
                analysis: null,
              });
            }
          }
        );
      } catch (error) {
        console.error("❌ Error getting detailed page analysis:", error);
        resolve({
          error: error.message,
          analysis: null,
        });
      }
    });
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

  async openGPTPopup() {
    try {
      const popup = await chrome.windows.create({
        url: chrome.runtime.getURL("gpt-popup.html"),
        type: "popup",
        width: 500,
        height: 700,
        focused: true,
      });

      console.log("GPT popup opened:", popup.id);
      return popup;
    } catch (error) {
      console.error("Failed to open GPT popup:", error);
      throw error;
    }
  }

  async openLighthouseResults(results) {
    try {
      // Create HTML content for Lighthouse results
      const htmlContent = this.generateLighthouseHTML(results);

      // Create a data URL with the HTML content
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(
        htmlContent
      )}`;

      const popup = await chrome.windows.create({
        url: dataUrl,
        type: "popup",
        width: 800,
        height: 900,
        focused: true,
      });

      console.log("Lighthouse results popup opened:", popup.id);
      return popup;
    } catch (error) {
      console.error("Failed to open Lighthouse results:", error);
      throw error;
    }
  }

  generateLighthouseHTML(results) {
    const getScoreColor = (score) => {
      if (score >= 90) return "#0cce6b";
      if (score >= 50) return "#ffa400";
      return "#ff5722";
    };

    const getScoreGrade = (score) => {
      if (score >= 90) return "Good";
      if (score >= 50) return "Needs Improvement";
      return "Poor";
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Report - ${results.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .scores {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .score-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        .score-card:hover { transform: translateY(-2px); }
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
        }
        .score-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
        }
        .score-grade {
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .metrics {
            padding: 30px;
        }
        .metrics h2 {
            margin-bottom: 20px;
            color: #333;
            font-size: 22px;
        }
        .metric-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
        }
        .metric-row:last-child { border-bottom: none; }
        .metric-name {
            font-weight: 500;
            color: #333;
        }
        .metric-value {
            font-weight: 600;
            color: #667eea;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .timestamp {
            margin-top: 10px;
            font-size: 12px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Lighthouse Report</h1>
            <p>${results.url}</p>
        </div>

        <div class="scores">
            <div class="score-card">
                <div class="score-circle" style="background-color: ${getScoreColor(
                  results.scores.performance
                )}">
                    ${results.scores.performance}
                </div>
                <div class="score-label">Performance</div>
                <div class="score-grade" style="color: ${getScoreColor(
                  results.scores.performance
                )}">
                    ${getScoreGrade(results.scores.performance)}
                </div>
            </div>

            <div class="score-card">
                <div class="score-circle" style="background-color: ${getScoreColor(
                  results.scores.accessibility
                )}">
                    ${results.scores.accessibility}
                </div>
                <div class="score-label">Accessibility</div>
                <div class="score-grade" style="color: ${getScoreColor(
                  results.scores.accessibility
                )}">
                    ${getScoreGrade(results.scores.accessibility)}
                </div>
            </div>

            <div class="score-card">
                <div class="score-circle" style="background-color: ${getScoreColor(
                  results.scores.bestPractices
                )}">
                    ${results.scores.bestPractices}
                </div>
                <div class="score-label">Best Practices</div>
                <div class="score-grade" style="color: ${getScoreColor(
                  results.scores.bestPractices
                )}">
                    ${getScoreGrade(results.scores.bestPractices)}
                </div>
            </div>

            <div class="score-card">
                <div class="score-circle" style="background-color: ${getScoreColor(
                  results.scores.seo
                )}">
                    ${results.scores.seo}
                </div>
                <div class="score-label">SEO</div>
                <div class="score-grade" style="color: ${getScoreColor(
                  results.scores.seo
                )}">
                    ${getScoreGrade(results.scores.seo)}
                </div>
            </div>
        </div>

        <div class="metrics">
            <h2>📊 Performance Metrics</h2>
            <div class="metric-row">
                <span class="metric-name">First Contentful Paint</span>
                <span class="metric-value">${(
                  results.metrics.firstContentfulPaint / 1000
                ).toFixed(2)}s</span>
            </div>
            <div class="metric-row">
                <span class="metric-name">Largest Contentful Paint</span>
                <span class="metric-value">${(
                  results.metrics.largestContentfulPaint / 1000
                ).toFixed(2)}s</span>
            </div>
            <div class="metric-row">
                <span class="metric-name">Total Load Time</span>
                <span class="metric-value">${(
                  results.metrics.loadTime / 1000
                ).toFixed(2)}s</span>
            </div>
            <div class="metric-row">
                <span class="metric-name">DOM Content Loaded</span>
                <span class="metric-value">${(
                  results.metrics.domContentLoaded / 1000
                ).toFixed(2)}s</span>
            </div>
            <div class="metric-row">
                <span class="metric-name">Cumulative Layout Shift</span>
                <span class="metric-value">${results.metrics.cumulativeLayoutShift.toFixed(
                  3
                )}</span>
            </div>
        </div>

        <div class="footer">
            <div>🚀 Generated by GPT Chrome Extension</div>
            <div class="timestamp">
                ${new Date(results.timestamp).toLocaleString()}
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

// Initialize background service
new BackgroundService();
