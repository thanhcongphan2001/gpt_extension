// Lighthouse Service for Chrome Extension
// Provides performance auditing capabilities

export class LighthouseService {
  constructor() {
    this.isRunning = false;
    this.results = null;
  }

  async runAudit(url = null) {
    if (this.isRunning) {
      throw new Error("Lighthouse audit is already running");
    }

    this.isRunning = true;

    try {
      // Get current tab URL if not provided
      if (!url) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        url = tab.url;
      }

      console.log(`[Lighthouse] Starting audit for: ${url}`);

      // Use Chrome DevTools Protocol to run Lighthouse
      const results = await this.runLighthouseAudit(url);

      this.results = results;
      this.isRunning = false;

      return results;
    } catch (error) {
      this.isRunning = false;
      console.error("[Lighthouse] Audit failed:", error);
      throw error;
    }
  }

  async runLighthouseAudit(url) {
    return new Promise((resolve, reject) => {
      // Create a new tab for the audit
      chrome.tabs.create({ url: url, active: false }, async (tab) => {
        try {
          // Attach debugger to the tab
          await chrome.debugger.attach({ tabId: tab.id }, "1.3");

          // Enable necessary domains
          await this.sendDebuggerCommand(tab.id, "Runtime.enable");
          await this.sendDebuggerCommand(tab.id, "Page.enable");
          await this.sendDebuggerCommand(tab.id, "Network.enable");

          // Wait for page to load
          await this.waitForPageLoad(tab.id);

          // Run basic performance metrics
          const metrics = await this.collectPerformanceMetrics(tab.id);

          // Detach debugger and close tab
          await chrome.debugger.detach({ tabId: tab.id });
          await chrome.tabs.remove(tab.id);

          resolve(metrics);
        } catch (error) {
          // Cleanup on error
          try {
            await chrome.debugger.detach({ tabId: tab.id });
            await chrome.tabs.remove(tab.id);
          } catch (cleanupError) {
            console.error("[Lighthouse] Cleanup error:", cleanupError);
          }
          reject(error);
        }
      });
    });
  }

  async sendDebuggerCommand(tabId, method, params = {}) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  async waitForPageLoad(tabId) {
    return new Promise((resolve) => {
      const listener = (source, method, params) => {
        if (source.tabId === tabId && method === "Page.loadEventFired") {
          chrome.debugger.onEvent.removeListener(listener);
          // Wait a bit more for resources to load
          setTimeout(resolve, 2000);
        }
      };

      chrome.debugger.onEvent.addListener(listener);

      // Fallback timeout
      setTimeout(() => {
        chrome.debugger.onEvent.removeListener(listener);
        resolve();
      }, 10000);
    });
  }

  async collectPerformanceMetrics(tabId) {
    try {
      // Get performance metrics
      const performanceMetrics = await this.sendDebuggerCommand(
        tabId,
        "Performance.getMetrics"
      );

      // Get runtime metrics
      const runtimeResult = await this.sendDebuggerCommand(
        tabId,
        "Runtime.evaluate",
        {
          expression: `
          JSON.stringify({
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
            largestContentfulPaint: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
            cumulativeLayoutShift: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0),
            url: window.location.href,
            title: document.title,
            timestamp: Date.now()
          })
        `,
          returnByValue: true,
        }
      );

      const webVitals = JSON.parse(runtimeResult.result.value);

      // Calculate scores (simplified Lighthouse-like scoring)
      const scores = this.calculateScores(webVitals);

      return {
        url: webVitals.url,
        title: webVitals.title,
        timestamp: webVitals.timestamp,
        metrics: webVitals,
        scores: scores,
        categories: {
          performance: scores.performance,
          accessibility: scores.accessibility,
          bestPractices: scores.bestPractices,
          seo: scores.seo,
        },
      };
    } catch (error) {
      console.error("[Lighthouse] Failed to collect metrics:", error);
      throw error;
    }
  }

  calculateScores(metrics) {
    // Simplified scoring algorithm (similar to Lighthouse)
    const performance = this.calculatePerformanceScore(metrics);

    return {
      performance: performance,
      accessibility: Math.floor(Math.random() * 20) + 80, // Mock for now
      bestPractices: Math.floor(Math.random() * 20) + 75, // Mock for now
      seo: Math.floor(Math.random() * 20) + 85, // Mock for now
      overall: Math.round((performance + 80 + 75 + 85) / 4),
    };
  }

  calculatePerformanceScore(metrics) {
    let score = 100;

    // First Contentful Paint (target: < 1.8s)
    if (metrics.firstContentfulPaint > 1800) {
      score -= Math.min(30, (metrics.firstContentfulPaint - 1800) / 100);
    }

    // Largest Contentful Paint (target: < 2.5s)
    if (metrics.largestContentfulPaint > 2500) {
      score -= Math.min(25, (metrics.largestContentfulPaint - 2500) / 100);
    }

    // Load Time (target: < 3s)
    if (metrics.loadTime > 3000) {
      score -= Math.min(25, (metrics.loadTime - 3000) / 200);
    }

    // Cumulative Layout Shift (target: < 0.1)
    if (metrics.cumulativeLayoutShift > 0.1) {
      score -= Math.min(20, metrics.cumulativeLayoutShift * 100);
    }

    return Math.max(0, Math.round(score));
  }

  getLastResults() {
    return this.results;
  }

  isAuditRunning() {
    return this.isRunning;
  }

  // Mock Lighthouse results for testing
  getMockResults(url) {
    return {
      url: url,
      title: "Mock Lighthouse Report",
      timestamp: Date.now(),
      metrics: {
        loadTime: Math.floor(Math.random() * 2000) + 1000,
        domContentLoaded: Math.floor(Math.random() * 1500) + 800,
        firstPaint: Math.floor(Math.random() * 1000) + 500,
        firstContentfulPaint: Math.floor(Math.random() * 1200) + 600,
        largestContentfulPaint: Math.floor(Math.random() * 2000) + 1000,
        cumulativeLayoutShift: Math.random() * 0.3,
      },
      scores: {
        performance: Math.floor(Math.random() * 40) + 60,
        accessibility: Math.floor(Math.random() * 20) + 80,
        bestPractices: Math.floor(Math.random() * 20) + 75,
        seo: Math.floor(Math.random() * 20) + 85,
        overall: Math.floor(Math.random() * 30) + 70,
      },
      categories: {
        performance: Math.floor(Math.random() * 40) + 60,
        accessibility: Math.floor(Math.random() * 20) + 80,
        bestPractices: Math.floor(Math.random() * 20) + 75,
        seo: Math.floor(Math.random() * 20) + 85,
      },
    };
  }
}
