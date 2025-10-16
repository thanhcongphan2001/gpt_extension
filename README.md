# GPT Chrome Extension

🤖 Integrate GPT directly into Chrome with advanced debugging capabilities for seamless AI-powered browsing.

## Features

- **🤖 GPT Chat Integration**: Chat with GPT directly on any webpage with floating button
- **⚡ Lighthouse Performance Audit**: Built-in performance testing with beautiful reports
- **🔧 Advanced Debugging**: Real-time debug panel with logs, network monitoring, and export
- **⌨️ Keyboard Shortcuts**: Quick access with Ctrl+Shift+G/D/L shortcuts
- **🎯 Context-Aware**: Analyzes current page content for relevant responses
- **🛡️ Secure Storage**: API keys stored securely in Chrome's encrypted storage
- **🎛️ Local Testing Mode**: Test all features without API key required
- **📱 Responsive UI**: Clean, modern interface that works on all screen sizes

## Quick Start

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/gpt-chrome-extension.git
   cd gpt-chrome-extension
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the extension**

   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the `dist` folder

### Configuration

1. **Get OpenAI API Key**

   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Configure Extension**
   - Click the extension icon in Chrome toolbar
   - Paste your API key in the configuration section
   - Click "Save"

## Usage

### Basic Usage

#### **🤖 GPT Chat:**

- **Floating Button**: Click the 🤖 button (blue-purple) on any webpage
- **Keyboard Shortcut**: Press `Ctrl+Shift+G` to toggle chat panel
- **Extension Popup**: Click extension icon → "Toggle Chat Panel"
- **Context Menu**: Right-click selected text → "Analyze with GPT"

#### **⚡ Lighthouse Audit:**

- **Floating Button**: Click the ⚡ button (red-orange) next to GPT button
- **Keyboard Shortcut**: Press `Ctrl+Shift+L` to run performance audit
- **Extension Popup**: Click extension icon → "Run Lighthouse Audit"
- **Results**: View performance scores and detailed metrics

#### **🐛 Debug Panel:**

- **Keyboard Shortcut**: Press `Ctrl+Shift+D` to open debug panel
- **Extension Popup**: Click extension icon → "Toggle Debug Panel"
- **Features**: Real-time logs, network monitoring, performance metrics

### Chat Panel

- **Ask Questions**: Type any question about the current page or general topics
- **Page Analysis**: The extension automatically provides page context to GPT
- **Conversation History**: Maintains conversation context within each tab
- **Quick Actions**: Pre-built prompts for common tasks

### Debug Features

- **Debug Panel**: Press `Ctrl+Shift+D` to open the debug panel
- **Chrome DevTools**: Integrated panel in Chrome DevTools
- **Network Monitoring**: Track all GPT API requests
- **Performance Metrics**: Monitor memory usage and response times
- **Log Export**: Export debug logs for troubleshooting

## Development

### Prerequisites

- Node.js 16+ and npm
- Chrome browser
- OpenAI API key

### Development Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start development mode**

   ```bash
   npm run dev
   ```

3. **Load extension in Chrome**

   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Load unpacked from `dist` folder

4. **Enable hot reload** (optional)
   ```bash
   npm run watch
   ```

### Available Scripts

- `npm run dev` - Build and watch for changes
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run watch` - Watch mode with hot reload
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run clean` - Clean dist folder
- `npm run zip` - Create distribution package
- `npm run reload` - Reload extension in Chrome

### Project Structure

```
gpt-chrome-extension/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── popup.html/js/css     # Extension popup
├── debug-panel.html/js   # Debug interface
├── devtools.html/js      # DevTools integration
├── services/
│   └── gpt-service.js    # GPT API integration
├── utils/
│   └── debug-logger.js   # Logging utilities
├── scripts/
│   └── reload-extension.js # Development tools
└── .vscode/              # VS Code configuration
```

### Debugging

#### Chrome DevTools Integration

1. **Open DevTools** on any webpage
2. **Navigate to GPT Assistant tab**
3. **Monitor**:
   - API requests and responses
   - Console logs and errors
   - Performance metrics
   - Storage usage

#### Debug Panel

- **Access**: Press `Ctrl+Shift+D` or use popup button
- **Features**:
  - Real-time log viewing
  - Network request monitoring
  - Performance tracking
  - Storage inspection

#### VS Code Debugging

1. **Install recommended extensions**
2. **Use provided launch configurations**:
   - "Debug Chrome Extension" - Full extension debugging
   - "Debug Content Script" - Content script specific
   - "Debug Background Script" - Service worker debugging

### API Integration

#### GPT Service

The `GPTService` class handles all OpenAI API interactions:

```javascript
// Example usage
const gptService = new GPTService();
await gptService.setApiKey("your-api-key");

const response = await gptService.sendRequest({
  message: "Analyze this webpage",
  context: {
    url: window.location.href,
    title: document.title,
    selectedText: "selected text",
  },
});
```

#### Configuration Options

- **Model**: Default `gpt-3.5-turbo`, configurable
- **Max Tokens**: Default 1000, adjustable
- **Temperature**: Default 0.7, customizable
- **Context Window**: Automatic conversation history management

## Troubleshooting

### Common Issues

1. **Extension not loading**

   - Check Chrome Developer mode is enabled
   - Verify manifest.json syntax
   - Check console for errors

2. **API key not working**

   - Verify key format (starts with `sk-`)
   - Check OpenAI account has credits
   - Test with API test button

3. **Content script not injecting**

   - Check site permissions
   - Verify content script matches in manifest
   - Check for CSP restrictions

4. **Debug panel not opening**
   - Ensure debug mode is enabled
   - Check keyboard shortcuts
   - Verify iframe permissions

### Debug Information

Enable debug mode in extension popup to see:

- Extension version and status
- Active tab information
- API connection status
- Recent error logs

### Performance Issues

- **High memory usage**: Clear conversation history
- **Slow responses**: Check network connection and API status
- **UI lag**: Disable debug mode in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- Use ESLint configuration provided
- Follow existing code patterns
- Add JSDoc comments for functions
- Use meaningful variable names

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/gpt-chrome-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/gpt-chrome-extension/discussions)
- **Email**: your-email@example.com

## Changelog

### v1.0.0

- Initial release
- GPT integration with OpenAI API
- Chrome DevTools integration
- Debug panel and logging
- Hot reload development environment
- Context-aware conversations

---

Made with ❤️ for productivity and AI-powered browsing.
