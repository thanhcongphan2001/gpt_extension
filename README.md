# GPT Chrome Extension

Chrome extension tích hợp GPT với khả năng phân tích trang web và Lighthouse audit.

## ✨ Tính năng

- **🤖 GPT Chat**: Trò chuyện với GPT trong popup window riêng biệt
- **📊 Lighthouse Audit**: Kiểm tra hiệu suất trang web với Core Web Vitals
- **🔍 Phân tích trang web**: GPT tự động lấy nội dung trang web để phân tích
- **🛠️ Debug Tools**: Công cụ debug chi tiết với console logs
- **🎨 Modern UI**: Giao diện đẹp với React, TypeScript, và Tailwind CSS
- **🔐 Secure Storage**: API key được lưu an toàn trong Chrome storage

## 🚀 Cài đặt

1. **Clone repository:**

   ```bash
   git clone <repository-url>
   cd gpt-chrome-extension
   ```

2. **Cài đặt dependencies:**

   ```bash
   npm install
   ```

3. **Build extension:**

   ```bash
   npm run build
   ```

4. **Load vào Chrome:**

   - Mở `chrome://extensions/`
   - Bật "Developer mode"
   - Click "Load unpacked" → Chọn thư mục `dist`

5. **Cấu hình API Key:**
   - Click extension icon → Nhập OpenAI API key
   - API key được lưu an toàn trong Chrome storage

## 📖 Cách sử dụng

### 🤖 GPT Chat

1. **Mở GPT Chat:**

   ```
   Click extension icon → "Open GPT Chat"
   ```

2. **Sử dụng commands:**

   ```
   phân tích    → Phân tích trang web hiện tại
   debug        → Hiển thị thông tin debug extension
   ```

3. **Phân tích trang web:**
   - Gõ "phân tích" hoặc "phân tích trang web này"
   - GPT sẽ tự động lấy nội dung trang web (title, headings, paragraphs)
   - Phân tích và đưa ra nhận xét chi tiết

### 📊 Lighthouse Audit

1. **Chạy audit:**

   ```
   Click extension icon → "Run Lighthouse Audit"
   ```

2. **Xem kết quả:**
   - Performance Score
   - Core Web Vitals (LCP, FID, CLS)
   - SEO và Accessibility metrics
   - Popup window hiển thị kết quả chi tiết

### 🔍 Debug Tools

1. **Debug command:**

   ```
   Gõ "debug" trong GPT Chat
   → Hiển thị Extension ID, Current Page, Page Response
   ```

## 🛠️ Development

### Prerequisites

- Node.js 16+ và npm
- Chrome browser
- OpenAI API key

### Development Setup

```bash
# Cài đặt dependencies
npm install

# Build extension
npm run build

# Development mode (watch changes)
npm run dev

# Type checking
npm run type-check
```

### Available Scripts

| Command              | Chức năng           |
| -------------------- | ------------------- |
| `npm run build`      | Build production    |
| `npm run dev`        | Development mode    |
| `npm run type-check` | TypeScript checking |

## 📁 Cấu trúc project

```
src/
├── background/          # Background script
├── popup/              # Main extension popup
├── gpt-popup/          # GPT chat window
├── services/           # GPT & Lighthouse services
├── styles/             # Global styles
└── types/              # TypeScript types

dist/                   # Built extension files
manifest.json           # Extension manifest
```

## 🏗️ Tech Stack

- **⚛️ React 18** - UI framework
- **📘 TypeScript** - Type safety
- **⚡ Vite** - Build tool siêu nhanh
- **🎨 Tailwind CSS** - Utility-first CSS
- **🔧 Chrome Extension Manifest V3** - Extension platform

## 🎯 Commands

| Command     | Chức năng                    |
| ----------- | ---------------------------- |
| `phân tích` | Phân tích trang web hiện tại |
| `debug`     | Hiển thị thông tin debug     |

## 🔑 API Key

Extension cần OpenAI API key để hoạt động:

- Key được lưu local trong Chrome storage
- Chỉ gửi đến OpenAI API, không gửi server khác
- Có thể thay đổi key bất kỳ lúc nào

## 🚨 Troubleshooting

### Vấn đề thường gặp

1. **Extension không load:**

   - Kiểm tra Developer mode đã bật
   - Verify manifest.json syntax
   - Check console errors

2. **API key không hoạt động:**

   - Verify key format (bắt đầu với `sk-`)
   - Check OpenAI account có credits
   - Test với debug command

3. **GPT không nhận page content:**
   - Gõ "debug" để kiểm tra
   - Xem Background Console logs
   - Kiểm tra tab permissions

## 📝 License

MIT License

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Submit pull request

---

**Made with ❤️ for AI-powered browsing**
