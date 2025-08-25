#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class MagazineGenerator {
    constructor() {
        this.template = this.getBaseTemplate();
    }

    generateMagazine(config) {
        const { title, subtitle, issue, sections } = config;
        
        let html = this.template;
        
        // Replace title placeholders (use global replace)
        html = html.replace(/\{\{TITLE\}\}/g, title);
        html = html.replace(/\{\{SUBTITLE\}\}/g, subtitle);
        html = html.replace(/\{\{ISSUE\}\}/g, issue);
        // Replace layout class placeholder
        const layoutClass = `layout-${this.normalizeLayout(config.layout)}`;
        html = html.replace('{{LAYOUT_CLASS}}', layoutClass);
        
        // Generate section indicators (include cover page as section 0)
        const totalSections = sections.length + 1; // +1 for cover page
        const sectionIndicators = Array.from({length: totalSections}, (_, index) => 
            `<div class="section-dot${index === 0 ? ' active' : ''}" data-section="${index}"></div>`
        ).join('\n            ');
        
        // Generate sections HTML (content sections start at index 1, cover is 0)
        const sectionsHTML = sections.map((section, sectionIndex) => {
            const pagesHTML = section.pages.map((page, pageIndex) => {
                const pageClasses = `page${pageIndex === 0 ? ' active' : ''} ${page.backgroundClass || ''}`;
                
                return `            <div class="${pageClasses}">
                <div class="page-content">
                    <h2 class="article-title">${page.title}</h2>
                    <div class="article-content">
                        ${page.content.map(paragraph => `<p>${paragraph}</p>`).join('\n                        <br>\n                        ')}
                    </div>
                    ${page.altText ? `<div class="sr-only">${page.altText}</div>` : ''}
                </div>
            </div>`;
            }).join('\n');
            
            const pageIndicators = section.pages.map((_, index) => 
                `<div class="page-dot${index === 0 ? ' active' : ''}"></div>`
            ).join('\n                ');
            
            return `        <section class="section" data-section="${sectionIndex + 1}">
${pagesHTML}
            <div class="page-indicator">
                ${pageIndicators}
            </div>
        </section>`;
        }).join('\n\n');
        
        // Replace placeholders
        html = html.replace('{{SECTION_INDICATORS}}', sectionIndicators);
        html = html.replace('{{SECTIONS}}', sectionsHTML);
        
        return html;
    }

    addCustomCSS(html, customCSS) {
        if (!customCSS) return html;
        
        const insertPoint = html.indexOf('</style>');
        return html.slice(0, insertPoint) + '\n\n        /* Custom CSS */\n        ' + customCSS + '\n    ' + html.slice(insertPoint);
    }

    generatePWAManifest(config) {
        return {
            name: config.title,
            short_name: config.title,
            description: config.subtitle,
            start_url: "./",
            display: "standalone",
            orientation: "landscape",
            background_color: "#000000",
            theme_color: "#667eea",
            icons: [
                {
                    src: "icon-192.png",
                    sizes: "192x192",
                    type: "image/png"
                },
                {
                    src: "icon-512.png", 
                    sizes: "512x512",
                    type: "image/png"
                }
            ]
        };
    }

    generateServiceWorker() {
        return `const CACHE_NAME = 'magazine-v1';
const urlsToCache = [
    './',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});`;
    }

    /* ---------------- Markdown ingestion ---------------- */
    normalizeLayout(layout) {
        const allowed = new Set(['classic', 'split', 'minimal']);
        const val = String(layout || 'classic').toLowerCase();
        return allowed.has(val) ? val : 'classic';
    }

    buildConfigFromMarkdown(mdFiles, options = {}) {
        // options can include: title, subtitle, issue, filename, layout, section
        const sectionsMap = new Map(); // preserve insertion order

        const readSource = (srcPath) => {
            if (srcPath === '-' || srcPath === '/dev/stdin') {
                // Read from stdin synchronously
                try {
                    return fs.readFileSync(0, 'utf8');
                } catch (e) {
                    throw new Error('Failed to read from stdin');
                }
            }
            return fs.readFileSync(srcPath, 'utf8');
        };

        const ensureSection = (name) => {
            const key = (name && String(name).trim()) || 'Articles';
            if (!sectionsMap.has(key)) sectionsMap.set(key, { pages: [] });
            return key;
        };

        mdFiles.forEach((filePath) => {
            const raw = readSource(filePath);
            const { fm, body } = this.parseFrontMatter(raw);
            const fallback = filePath ? path.basename(filePath, path.extname(filePath)) : 'Untitled';
            const { title, paragraphs } = this.parseMarkdownBody(body, fallback);

            const page = {
                title: (fm.title || title || 'Untitled').trim(),
                backgroundClass: (fm.backgroundClass || '').trim(),
                content: paragraphs,
                altText: (fm.altText || '').trim()
            };

            const sectionName = (fm.section || options.section || 'Articles').trim();
            const key = ensureSection(sectionName);
            sectionsMap.get(key).pages.push(page);
        });

        const sections = Array.from(sectionsMap.entries()).map(([_, val]) => val);
        if (sections.length === 0 || sections.every(s => !s.pages || s.pages.length === 0)) {
            throw new Error('No pages found from Markdown input. Ensure files are not empty and contain content.');
        }

        return {
            title: options.title || 'My Magazine',
            subtitle: options.subtitle || '',
            issue: options.issue || '',
            filename: options.filename || 'magazine.html',
            layout: this.normalizeLayout(options.layout),
            sections
        };
    }

    parseFrontMatter(src) {
        if (src.startsWith('---')) {
            const end = src.indexOf('\n---', 3);
            if (end !== -1) {
                const fmText = src.slice(3, end).trim();
                const body = src.slice(end + 4).replace(/^\n/, '');
                const fm = {};
                fmText.split('\n').forEach(line => {
                    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
                    if (m) {
                        const k = m[1].trim();
                        let v = m[2].trim();
                        v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
                        fm[k] = v;
                    }
                });
                return { fm, body };
            }
        }
        return { fm: {}, body: src };
    }

    parseMarkdownBody(body, fallbackTitle = 'Untitled') {
        const lines = body.split(/\r?\n/);
        let title = '';
        const contentLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!title && /^#{1,6}\s+/.test(line)) {
                title = line.replace(/^#{1,6}\s+/, '').trim();
                continue;
            }
            contentLines.push(line);
        }
        if (!title) title = fallbackTitle;

        // Split into blocks by blank lines
        const rawBlocks = contentLines.join('\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

        const paragraphs = rawBlocks.map(block => {
            // Detect list blocks and convert to line-broken list inside paragraph
            const isList = /^(?:[-*+]\s+|\d+\.\s+)/m.test(block);
            if (isList) {
                const listLines = block.split(/\n/).map(l => l.replace(/^[-*+]\s+/, '• ').replace(/^(\d+)\.\s+/, '$1) '));
                return this.mdInlineToHTML(listLines.join('<br>'));
            }
            // Regular paragraph
            const cleaned = block.replace(/^#{1,6}\s+/g, '');
            return this.mdInlineToHTML(cleaned);
        });

        return { title, paragraphs };
    }

    mdInlineToHTML(text) {
        // Basic inline markdown replacements: bold, italics, code, links
        let out = text;
        out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>');
        out = out.replace(/\*(.+?)\*/g, '<em>$1<\/em>');
        out = out.replace(/`([^`]+)`/g, '<code>$1<\/code>');
        out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>');
        return out;
    }

    build(config, outputDir = './output') {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generate main HTML file
        let html = this.generateMagazine(config);
        
        // Add custom CSS if provided
        if (config.customCSS) {
            html = this.addCustomCSS(html, config.customCSS);
        }

        // Add PWA manifest link
        html = html.replace('<title>', `<link rel="manifest" href="manifest.json">
    <title>`);

        // Add service worker registration
        const swScript = `
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => console.log('SW registered'))
                    .catch(registrationError => console.log('SW registration failed'));
            });
        }`;
        
        html = html.replace('</script>', swScript + '\n    </script>');

        // Write files
        const filename = config.filename || 'magazine.html';
        fs.writeFileSync(path.join(outputDir, filename), html);
        fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(this.generatePWAManifest(config), null, 2));
        fs.writeFileSync(path.join(outputDir, 'sw.js'), this.generateServiceWorker());

        console.log(`✅ Magazine generated: ${path.join(outputDir, filename)}`);
        console.log(`📱 PWA files created: manifest.json, sw.js`);
    }

    getBaseTemplate() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - {{ISSUE}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Georgia', serif;
            overflow: hidden;
            height: 100vh;
            width: 100vw;
            background: #000;
        }

        @media screen and (orientation: portrait) {
            body::before {
                content: "For best experience, please rotate to landscape";
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 1.2rem;
                z-index: 1000;
                background: rgba(0,0,0,0.8);
                padding: 20px;
                border-radius: 10px;
            }
        }

        .magazine-container {
            height: 100vh;
            width: 100vw;
            position: relative;
            overflow: hidden;
        }

        .section {
            position: absolute;
            width: 100%;
            height: 100%;
            transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform: translateY(100vh);
        }

        .section.active {
            transform: translateY(0);
        }

        .section.prev {
            transform: translateY(-100vh);
        }

        .page {
            position: absolute;
            width: 100%;
            height: 100%;
            transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform: translateX(100%);
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
        }

        .page.active {
            transform: translateX(0);
        }

        .page.prev {
            transform: translateX(-100%);
        }

        .page-content {
            position: relative;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px;
            background: rgba(0,0,0,0.4);
        }

        .cover-page {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }

        .cover-title {
            font-size: 4rem;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }

        .cover-subtitle {
            font-size: 1.5rem;
            margin-bottom: 40px;
            opacity: 0.9;
        }

        .cover-issue {
            font-size: 1.2rem;
            opacity: 0.8;
        }

        .article-title {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 30px;
            text-align: center;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
        }

        .article-content {
            font-size: 1.2rem;
            line-height: 1.8;
            max-width: 800px;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
            text-align: justify;
        }

        .navigation-hint {
            position: absolute;
            bottom: 20px;
            right: 20px;
            color: rgba(255,255,255,0.7);
            font-size: 0.9rem;
            text-align: right;
        }

        .section-indicator {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 100;
        }

        .section-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transition: background 0.3s ease;
            cursor: pointer;
        }

        .section-dot.active {
            background: rgba(255,255,255,0.9);
        }

        .page-indicator {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
        }

        .page-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transition: background 0.3s ease;
        }

        .page-dot.active {
            background: rgba(255,255,255,0.9);
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        /* Predefined background classes */
        .tech-bg {
            background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), 
                        radial-gradient(circle at 20% 50%, #00d4ff 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, #ff0080 0%, transparent 50%),
                        radial-gradient(circle at 40% 80%, #8000ff 0%, transparent 50%),
                        #1a1a2e;
        }

        .ai-bg {
            background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
                        conic-gradient(from 0deg at 50% 50%, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff6b6b);
        }

        .startup-bg {
            background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
                        linear-gradient(45deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
        }

        .future-bg {
            background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)),
                        linear-gradient(180deg, #a8edea 0%, #fed6e3 100%);
        }

        .nature-bg {
            background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)),
                        linear-gradient(120deg, #a8e6cf 0%, #dcedc8 100%);
        }

        .sunset-bg {
            background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)),
                        linear-gradient(45deg, #ff9a56 0%, #ff6b95 100%);
        }
        /* Layout variants */
        .layout-split .page-content {
            background: linear-gradient(90deg, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0) 100%);
            align-items: flex-start;
            justify-content: center;
            text-align: left;
            padding: 60px;
        }
        .layout-split .article-title {
            text-align: left;
            margin-left: 0;
        }
        .layout-split .article-content {
            max-width: 600px;
            text-align: left;
        }

        .layout-minimal .page-content {
            background: none;
        }
        .layout-minimal .article-title {
            position: absolute;
            bottom: 60px;
            left: 60px;
            text-align: left;
        }
        .layout-minimal .article-content {
            position: absolute;
            bottom: 20px;
            left: 60px;
            max-width: 700px;
            background: rgba(0,0,0,0.35);
            padding: 16px 20px;
            border-radius: 8px;
            text-align: left;
        }
    </style>
</head>
<body class="{{LAYOUT_CLASS}}">
    <div class="magazine-container">
        <div class="section-indicator">
            {{SECTION_INDICATORS}}
        </div>

        <section class="section active" data-section="0">
            <div class="page active cover-page">
                <div class="page-content">
                    <h1 class="cover-title">{{TITLE}}</h1>
                    <p class="cover-subtitle">{{SUBTITLE}}</p>
                    <p class="cover-issue">{{ISSUE}}</p>
                </div>
                <div class="navigation-hint">
                    Swipe ↕ for sections<br>
                    Swipe ← → for pages
                </div>
            </div>
            <div class="page-indicator">
                <div class="page-dot active"></div>
            </div>
        </section>

{{SECTIONS}}
    </div>

    <script>
        class MagazineNavigator {
            constructor() {
                this.currentSection = 0;
                this.currentPage = 0;
                this.sections = document.querySelectorAll('.section');
                this.totalSections = this.sections.length;
                this.touchStartX = 0;
                this.touchStartY = 0;
                this.touchEndX = 0;
                this.touchEndY = 0;
                this.minSwipeDistance = 50;
                
                this.init();
            }

            init() {
                this.addEventListeners();
                this.updateIndicators();
            }

            addEventListeners() {
                document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
                document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
                document.addEventListener('keydown', (e) => this.handleKeyDown(e));
                
                document.querySelectorAll('.section-dot').forEach((dot, index) => {
                    dot.addEventListener('click', () => this.goToSection(index));
                });
            }

            handleTouchStart(e) {
                this.touchStartX = e.changedTouches[0].screenX;
                this.touchStartY = e.changedTouches[0].screenY;
            }

            handleTouchEnd(e) {
                this.touchEndX = e.changedTouches[0].screenX;
                this.touchEndY = e.changedTouches[0].screenY;
                this.handleSwipe();
            }

            handleSwipe() {
                const deltaX = this.touchEndX - this.touchStartX;
                const deltaY = this.touchEndY - this.touchStartY;
                const absDeltaX = Math.abs(deltaX);
                const absDeltaY = Math.abs(deltaY);

                if (Math.max(absDeltaX, absDeltaY) < this.minSwipeDistance) return;

                if (absDeltaY > absDeltaX) {
                    if (deltaY < 0) {
                        this.nextSection();
                    } else {
                        this.prevSection();
                    }
                } else {
                    if (deltaX < 0) {
                        this.nextPage();
                    } else {
                        this.prevPage();
                    }
                }
            }

            handleKeyDown(e) {
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.prevSection();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.nextSection();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prevPage();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextPage();
                        break;
                }
            }

            nextSection() {
                if (this.currentSection < this.totalSections - 1) {
                    this.goToSection(this.currentSection + 1);
                }
            }

            prevSection() {
                if (this.currentSection > 0) {
                    this.goToSection(this.currentSection - 1);
                }
            }

            goToSection(sectionIndex) {
                if (sectionIndex >= 0 && sectionIndex < this.totalSections) {
                    this.sections.forEach((section, index) => {
                        section.classList.remove('active', 'prev');
                        if (index === sectionIndex) {
                            section.classList.add('active');
                        } else if (index < sectionIndex) {
                            section.classList.add('prev');
                        }
                    });
                    
                    this.currentSection = sectionIndex;
                    this.currentPage = 0;
                    
                    this.updateIndicators();
                    this.updatePages();
                }
            }

            nextPage() {
                const currentSectionElement = this.sections[this.currentSection];
                const pages = currentSectionElement.querySelectorAll('.page');
                
                if (this.currentPage < pages.length - 1) {
                    this.goToPage(this.currentPage + 1);
                }
            }

            prevPage() {
                if (this.currentPage > 0) {
                    this.goToPage(this.currentPage - 1);
                }
            }

            goToPage(pageIndex) {
                const currentSectionElement = this.sections[this.currentSection];
                const pages = currentSectionElement.querySelectorAll('.page');
                
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    pages.forEach((page, index) => {
                        page.classList.remove('active', 'prev');
                        if (index === pageIndex) {
                            page.classList.add('active');
                        } else if (index < pageIndex) {
                            page.classList.add('prev');
                        }
                    });
                    
                    this.currentPage = pageIndex;
                    this.updatePageIndicators();
                }
            }

            updatePages() {
                const currentSectionElement = this.sections[this.currentSection];
                const pages = currentSectionElement.querySelectorAll('.page');
                
                pages.forEach((page, index) => {
                    page.classList.remove('active', 'prev');
                    if (index === this.currentPage) {
                        page.classList.add('active');
                    } else if (index < this.currentPage) {
                        page.classList.add('prev');
                    }
                });
                
                this.updatePageIndicators();
            }

            updateIndicators() {
                document.querySelectorAll('.section-dot').forEach((dot, index) => {
                    if (index === this.currentSection) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            }

            updatePageIndicators() {
                const currentSectionElement = this.sections[this.currentSection];
                const pageIndicator = currentSectionElement.querySelector('.page-indicator');
                
                if (pageIndicator) {
                    const pageDots = pageIndicator.querySelectorAll('.page-dot');
                    pageDots.forEach((dot, index) => {
                        if (index === this.currentPage) {
                            dot.classList.add('active');
                        } else {
                            dot.classList.remove('active');
                        }
                    });
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new MagazineNavigator();
        });
    </script>
</body>
</html>`;
    }
}

module.exports = MagazineGenerator;

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);

    const showUsage = () => {
        console.log(`Usage:\n\n  From JSON config:\n    node magazine-generator.js <config.json>\n\n  From Markdown files:\n    node magazine-generator.js --md <file1.md> [file2.md ...] [--title "Title"] [--subtitle "Sub"] [--issue "Issue"] [--layout classic|split|minimal] [--section "Section Name"] [--filename out.html] [--outdir ./output]\n\n  From stdin (single Markdown):\n    cat article.md | node magazine-generator.js --md - --title "Title" --layout split\n`);
    };

    if (args.length === 0) {
        showUsage();
        process.exit(1);
    }

    // JSON mode
    if (args[0] !== '--md' && /\.json$/i.test(args[0])) {
        try {
            const config = JSON.parse(fs.readFileSync(args[0], 'utf8'));
            const generator = new MagazineGenerator();
            generator.build(config);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
        process.exit(0);
    }

    // Markdown mode
    if (args[0] === '--md') {
        const opts = {};
        const mdFiles = [];
        let outdir = './output';
        for (let i = 1; i < args.length; i++) {
            const a = args[i];
            if (a === '--title') { opts.title = String(args[++i] || ''); continue; }
            if (a === '--subtitle') { opts.subtitle = String(args[++i] || ''); continue; }
            if (a === '--issue') { opts.issue = String(args[++i] || ''); continue; }
            if (a === '--layout') { opts.layout = String(args[++i] || 'classic'); continue; }
            if (a === '--section') { opts.section = String(args[++i] || ''); continue; }
            if (a === '--filename') { opts.filename = String(args[++i] || 'magazine.html'); continue; }
            if (a === '--outdir') { outdir = String(args[++i] || './output'); continue; }
            if (a.startsWith('--')) {
                console.warn(`Unknown option: ${a}`);
                continue;
            }
            mdFiles.push(a);
        }

        if (mdFiles.length === 0) {
            console.error('No Markdown files provided. Pass one or more files, or "-" to read from stdin.');
            showUsage();
            process.exit(1);
        }

        try {
            const generator = new MagazineGenerator();
            const config = generator.buildConfigFromMarkdown(mdFiles, opts);
            generator.build(config, outdir);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
        process.exit(0);
    }

    showUsage();
    process.exit(1);
}
