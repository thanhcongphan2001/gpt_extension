import { execSync } from "child_process";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

console.log("🚀 Building React Chrome Extension...");

// Run Vite build
console.log("📦 Running Vite build...");
execSync("vite build", { stdio: "inherit" });

// Copy static files
console.log("📁 Copying static files...");

// Ensure dist directory exists
if (!existsSync("dist")) {
  mkdirSync("dist");
}

// Copy manifest.json
copyFileSync("manifest.json", "dist/manifest.json");
console.log("✅ Copied manifest.json");

// Copy icons directory
if (!existsSync("dist/icons")) {
  mkdirSync("dist/icons", { recursive: true });
}

const iconFiles = ["icon16.png", "icon32.png", "icon48.png", "icon128.png"];
iconFiles.forEach((file) => {
  if (existsSync(`icons/${file}`)) {
    copyFileSync(`icons/${file}`, `dist/icons/${file}`);
    console.log(`✅ Copied icons/${file}`);
  }
});

// Copy services directory
if (!existsSync("dist/services")) {
  mkdirSync("dist/services", { recursive: true });
}

const serviceFiles = ["gpt-service.js", "lighthouse-service.js"];
serviceFiles.forEach((file) => {
  if (existsSync(`src/services/${file}`)) {
    copyFileSync(`src/services/${file}`, `dist/services/${file}`);
    console.log(`✅ Copied services/${file}`);
  }
});

// Move HTML files to root
if (existsSync("dist/src/popup/index.html")) {
  copyFileSync("dist/src/popup/index.html", "dist/popup.html");
  console.log("✅ Moved popup.html to root");
}

if (existsSync("dist/src/gpt-popup/index.html")) {
  copyFileSync("dist/src/gpt-popup/index.html", "dist/gpt-popup.html");
  console.log("✅ Moved gpt-popup.html to root");
}

console.log("🎉 Build completed successfully!");
console.log("📂 Extension files are in the dist/ directory");
console.log("🔧 Load the extension from chrome://extensions/ (Developer mode)");
