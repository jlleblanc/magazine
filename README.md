# Magazine CMS

A static HTML magazine generator that creates swipeable, PWA-enabled publications in a single HTML file.

## Features

- **📱 Touch Navigation**: Swipe up/down for sections, left/right for pages
- **🎨 Beautiful Backgrounds**: CSS gradient backgrounds with predefined themes
- **♿ Accessibility**: Screen reader support with hidden alt text
- **📺 Landscape Optimized**: Best experience in landscape orientation
- **🔄 PWA Ready**: Offline support with service worker and manifest
- **⚡ Single File**: Everything contained in one HTML file

## Quick Start

1. **Install dependencies** (Node.js required):
```bash
npm init -y
```

2. **Create a magazine config** (see `example-config.json`):
```json
{
  "title": "Your Magazine",
  "subtitle": "Your Subtitle",
  "issue": "Issue #1",
  "sections": [...]
}
```

3. **Generate the magazine**:
```bash
node magazine-generator.js example-config.json
```

4. **Open the generated HTML file** in your browser

## Configuration

### Basic Structure
```json
{
  "title": "Magazine Title",
  "subtitle": "Magazine Subtitle", 
  "issue": "Issue #1 • Date",
  "filename": "output-name.html",
  "sections": [...],
  "customCSS": "/* Optional custom styles */"
}
```

### Section Structure
```json
{
  "pages": [
    {
      "title": "Page Title",
      "backgroundClass": "ai-bg",
      "content": [
        "First paragraph",
        "Second paragraph"
      ],
      "altText": "Screen reader description of background"
    }
  ]
}
```

### Available Background Classes

- `tech-bg` - Blue/purple tech gradients
- `ai-bg` - Colorful AI-inspired patterns
- `startup-bg` - Pink innovation gradients
- `future-bg` - Teal to pink futuristic
- `nature-bg` - Green environmental themes
- `sunset-bg` - Orange/pink sunset colors

## Navigation

- **Touch**: Swipe gestures on mobile/tablet
- **Keyboard**: Arrow keys (↑↓ sections, ←→ pages)
- **Click**: Section dots on left side

## PWA Features

The generator automatically creates:
- `manifest.json` - PWA configuration
- `sw.js` - Service worker for offline support
- Proper meta tags for mobile optimization

## File Structure

```
output/
├── magazine.html      # Main magazine file
├── manifest.json      # PWA manifest
└── sw.js             # Service worker
```

## Example Usage

```bash
# Generate from config
node magazine-generator.js example-config.json

# Output will be in ./output/ directory
```

## Requirements

- Node.js (for generation)
- Modern web browser (for viewing)
- No external dependencies for the generated HTML

## Browser Support

- Chrome/Safari/Firefox (desktop & mobile)
- Touch gestures on iOS/Android
- Keyboard navigation for accessibility
- PWA installation on supported devices
