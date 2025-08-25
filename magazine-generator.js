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
    </style>
</head>
<body>
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
    const configFile = process.argv[2];
    if (!configFile) {
        console.log('Usage: node magazine-generator.js <config.json>');
        process.exit(1);
    }

    try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        const generator = new MagazineGenerator();
        generator.build(config);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}
