# Icon Creation Guide

This extension requires icons in multiple sizes. You can create them using any image editor or online tools.

## Required Icon Sizes

- **16x16**: Small icon for extension toolbar
- **32x32**: Medium icon for extension management
- **48x48**: Standard icon for extension management
- **128x128**: Large icon for Chrome Web Store

## Icon Design Guidelines

### Visual Design
- **Theme**: AI/Robot theme with modern gradient
- **Colors**: Blue gradient (#667eea to #764ba2) matching the extension UI
- **Symbol**: Robot emoji (🤖) or custom robot/AI icon
- **Style**: Clean, modern, recognizable at small sizes

### Technical Requirements
- **Format**: PNG with transparency
- **Background**: Transparent or solid color
- **Quality**: High resolution, crisp edges
- **Consistency**: Same design across all sizes

## Quick Creation Methods

### Method 1: Using Online Tools
1. Go to [Favicon Generator](https://favicon.io/favicon-generator/)
2. Enter text "GPT" or upload a robot icon
3. Choose colors: Background #667eea, Text #ffffff
4. Download and rename files

### Method 2: Using Figma/Sketch
1. Create artboards for each size (16x16, 32x32, 48x48, 128x128)
2. Design robot/AI icon with gradient background
3. Export as PNG with transparency

### Method 3: Using GIMP/Photoshop
1. Create new document for each size
2. Add gradient background (#667eea to #764ba2)
3. Add robot emoji or custom icon
4. Export as PNG

### Method 4: Simple Text-Based Icons
For quick development, create simple text-based icons:

```css
/* CSS for creating text-based icons */
.icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: Arial, sans-serif;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

/* 16x16 */
.icon-16 {
  width: 16px;
  height: 16px;
  font-size: 10px;
}

/* 32x32 */
.icon-32 {
  width: 32px;
  height: 32px;
  font-size: 18px;
}

/* 48x48 */
.icon-48 {
  width: 48px;
  height: 48px;
  font-size: 28px;
}

/* 128x128 */
.icon-128 {
  width: 128px;
  height: 128px;
  font-size: 72px;
}
```

## File Naming Convention

Save icons with these exact names:
- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Placeholder Icons

For development, you can use these emoji-based icons:

### HTML Canvas Method
```html
<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <canvas id="canvas" width="128" height="128"></canvas>
    <script>
        function createIcon(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Gradient background
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            // Robot emoji
            ctx.font = `${size * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🤖', size/2, size/2);
            
            return canvas.toDataURL('image/png');
        }
        
        // Generate all sizes
        [16, 32, 48, 128].forEach(size => {
            const dataUrl = createIcon(size);
            const link = document.createElement('a');
            link.download = `icon${size}.png`;
            link.href = dataUrl;
            link.textContent = `Download ${size}x${size}`;
            document.body.appendChild(link);
            document.body.appendChild(document.createElement('br'));
        });
    </script>
</body>
</html>
```

## Testing Icons

After creating icons:

1. **Load extension** in Chrome
2. **Check toolbar** - 16x16 icon should appear
3. **Visit chrome://extensions/** - 48x48 icon should appear
4. **Check extension details** - 128x128 icon should appear

## Icon Optimization

- **Compress**: Use tools like TinyPNG to reduce file size
- **Test visibility**: Ensure icons are visible on light and dark backgrounds
- **Consistency**: Maintain visual consistency across all sizes
- **Accessibility**: Ensure sufficient contrast for visibility

## Alternative: SVG Icons

For scalable icons, you can also use SVG:

```svg
<!-- icon.svg -->
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" fill="url(#gradient)" rx="8"/>
  <text x="64" y="80" font-family="Arial" font-size="72" text-anchor="middle" fill="white">🤖</text>
</svg>
```

Then convert to PNG using online tools or ImageMagick:
```bash
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 32x32 icon32.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

---

Once you have created the icons, place them in the `icons/` folder and the extension will automatically use them.
