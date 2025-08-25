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
# Generate from config (JSON)
node magazine-generator.js example-config.json

# Generate from Markdown files
node magazine-generator.js --md article1.md article2.md \
  --title "Your Magazine" \
  --subtitle "Your Subtitle" \
  --issue "Issue #1 • 2025" \
  --layout split \
  --filename magazine.html \
  --outdir ./output

# Read a single Markdown article from stdin
cat article.md | node magazine-generator.js --md - --title "Your Magazine" --layout minimal

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

## Markdown Input

You can build a magazine directly from Markdown files. Each Markdown file becomes a page. You can group pages into sections via frontmatter or a global `--section` flag.

### Supported frontmatter (optional)

```
---
title: Neural Networks Explained
section: Features
backgroundClass: ai-bg
altText: Abstract AI-inspired background with vibrant gradients
---
```

### Markdown body

```
# Neural Networks Explained

Deep learning uses **layers** of computation. It supports *pattern recognition*, `code`, and [links](https://example.com).

- Bullet one
- Bullet two
```

Notes:
- The first `# Heading` becomes the page title if not provided in frontmatter.
- Basic inline Markdown supported: bold (`**text**`), italics (`*text*`), inline code (`` `code` ``), links (`[text](url)`).
- Lists are rendered as bullet lines within the paragraph.

## Layout Options

Choose a layout globally via JSON `layout` or CLI `--layout`:

- `classic` (default): Centered content with translucent backdrop.
- `split`: Left-aligned content with a side gradient overlay.
- `minimal`: No backdrop; title and content positioned near the bottom-left.

Examples:

```json
{
  "title": "Your Magazine",
  "issue": "Issue #1",
  "layout": "split",
  "sections": [ ... ]
}
```

```bash
node magazine-generator.js --md article.md --title "Your Magazine" --layout minimal
```
