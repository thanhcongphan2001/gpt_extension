import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        "gpt-popup": resolve(__dirname, "src/gpt-popup/index.html"),
        background: resolve(__dirname, "src/background/background.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background.js in root for Chrome extension
          if (chunkInfo.name === "background") {
            return "background.js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          // Keep HTML files in root
          if (assetInfo.name?.endsWith(".html")) {
            return "[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    // Don't minify for easier debugging
    minify: false,
    sourcemap: true,
    // Copy static files
    copyPublicDir: false,
  },
  // Copy additional files
  publicDir: false,
  // Ensure proper handling of Chrome extension APIs
  define: {
    global: "globalThis",
  },
});
