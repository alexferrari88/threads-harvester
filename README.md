# Threads Harvester

[![npm version](https://img.shields.io/npm/v/threads-harvester.svg)](https://www.npmjs.com/package/threads-harvester)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/threads-harvester)](https://bundlephobia.com/package/threads-harvester)
[![Tree Shaking](https://img.shields.io/badge/tree%20shaking-supported-brightgreen)](https://webpack.js.org/guides/tree-shaking/)

A TypeScript library for extracting threaded content from discussion platforms like Reddit, Twitter, and Hacker News with interactive selection UI and site-specific optimizations.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Data Types](#data-types)
- [Supported Platforms](#supported-platforms)
- [Usage Examples](#usage-examples)
- [Performance](#performance)
- [Security](#security)
- [Browser Compatibility](#browser-compatibility)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🧵 **Threaded content extraction** from popular discussion platforms
- 🎯 **Site-specific extractors** for HackerNews, Reddit, Twitter/X  
- 🔧 **Generic extractor** for any website with discussion content
- ✅ **Interactive checkbox UI** for content selection
- 🎨 **Customizable styling** with TypeScript-first approach
- 📦 **Zero dependencies** - pure TypeScript/JavaScript
- 🔒 **Type-safe** with full TypeScript support
- 🚀 **Framework-agnostic** - works in any browser environment

## Installation

```bash
npm install threads-harvester
```

## Quick Start

```typescript
import { ContentScraper } from 'threads-harvester';

// Create and run the scraper
const scraper = new ContentScraper();
await scraper.run();

// Listen for user selections
scraper.on('selectionChanged', (content) => {
  console.log('Selected content:', content);
});

// Get current content
const content = scraper.getContent();
console.log('All content:', content);

// Clean up when done
scraper.destroy();
```

## API Reference

### ContentScraper

The main class for threaded content extraction and UI management.

#### Constructor

```typescript
new ContentScraper(options?: ScraperOptions)
```

#### Methods

##### `run(): Promise<void>`

Extracts threaded content from the current page and optionally displays selection checkboxes.

```typescript
const scraper = new ContentScraper();
await scraper.run();
```

##### `displayCheckboxes(): void`

Manually display checkboxes for content selection (useful when `showCheckboxes` option is disabled).

```typescript
const scraper = new ContentScraper({ showCheckboxes: false });
await scraper.run();
scraper.displayCheckboxes(); // Show checkboxes on demand
```

##### `getContent(): Content | null`

Returns the current content with selection states.

```typescript
const content = scraper.getContent();
if (content) {
  console.log(`Found ${content.items.length} items on ${content.pageURL}`);
}
```

##### `on(eventName: 'selectionChanged', callback: (content: Content) => void): void`

Registers an event listener for selection changes.

```typescript
scraper.on('selectionChanged', (content) => {
  const selectedItems = content.items.filter(item => item.selected);
  console.log(`${selectedItems.length} items selected`);
});
```

##### `destroy(): void`

Cleans up the UI and event listeners.

```typescript
scraper.destroy();
```

## Configuration

### ScraperOptions

```typescript
interface ScraperOptions {
  includeHtml?: boolean;           // Include HTML content in extraction
  showCheckboxes?: boolean;        // Auto-display checkboxes after extraction
  checkboxStyling?: CheckboxStyling; // Custom styling for checkboxes
}
```

### Custom Styling

You can customize the checkbox appearance with the `CheckboxStyling` interface:

```typescript
import { ContentScraper, CheckboxStyling } from 'threads-harvester';

const customStyling: CheckboxStyling = {
  getDefaultStyles: () => `
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid #007acc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    z-index: 9999;
    transition: all 0.2s ease;
  `,
  
  getSelectedStyles: () => `
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid #007acc;
    border-radius: 4px;
    background: #007acc;
    cursor: pointer;
    z-index: 9999;
    color: white;
  `,
  
  getHoverStyles: () => `
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid #005999;
    border-radius: 4px;
    background: #f0f8ff;
    cursor: pointer;
    z-index: 9999;
    transition: all 0.2s ease;
  `,
  
  getPositioningStyles: (targetRect: DOMRect) => ({
    top: `${targetRect.top + window.pageYOffset - 5}px`,
    left: `${targetRect.left + window.pageXOffset - 30}px`
  })
};

const scraper = new ContentScraper({ 
  includeHtml: true,
  showCheckboxes: true,
  checkboxStyling: customStyling 
});
```

## Data Types

### Content

```typescript
interface Content {
  pageURL: string;    // URL of the current page
  title: string;      // Page title
  items: ContentItem[]; // Array of extracted content items
}
```

### ContentItem

```typescript
interface ContentItem {
  id: string;           // Unique identifier
  element: HTMLElement; // DOM element reference
  URL?: string;         // Item-specific URL (if available)
  textContent?: string; // Plain text content
  htmlContent?: string; // HTML content (if includeHtml: true)
  type: "post" | "comment"; // Content type
  selected: boolean;    // Selection state
}
```

## Supported Platforms

### Thread-Aware Extractors

- **HackerNews** (`news.ycombinator.com`) - Extracts posts and threaded comments
- **Reddit** (`reddit.com`) - Extracts posts and nested comment threads  
- **Twitter/X** (`twitter.com`, `x.com`) - Extracts tweets and reply threads
- **Generic** - Fallback extractor for any website using article/paragraph detection

### Automatic Platform Detection

The library automatically detects the current platform and uses the appropriate extractor:

```typescript
// On news.ycombinator.com - uses HackerNewsExtractor
// On reddit.com - uses RedditExtractor  
// On twitter.com or x.com - uses TwitterExtractor
// On any other site - uses GenericExtractor

const scraper = new ContentScraper();
await scraper.run(); // Automatically uses the right extractor
```

## Usage Examples

### Basic Thread Extraction

```typescript
import { ContentScraper } from 'threads-harvester';

async function extractThreads() {
  const scraper = new ContentScraper();
  
  try {
    await scraper.run();
    
    const content = scraper.getContent();
    if (content) {
      console.log(`Extracted ${content.items.length} items from ${content.title}`);
      
      // Separate posts from comments
      const posts = content.items.filter(item => item.type === 'post');
      const comments = content.items.filter(item => item.type === 'comment');
      
      console.log(`Posts: ${posts.length}, Comments: ${comments.length}`);
    }
  } catch (error) {
    console.error('Thread extraction failed:', error);
  } finally {
    scraper.destroy();
  }
}
```

### Real-time Selection Handling

```typescript
import { ContentScraper } from 'threads-harvester';

const scraper = new ContentScraper({ showCheckboxes: true });

// Set up event listener before running
scraper.on('selectionChanged', (content) => {
  const selected = content.items.filter(item => item.selected);
  
  if (selected.length > 0) {
    console.log('Selected thread content:');
    selected.forEach(item => {
      console.log(`- ${item.type}: ${item.textContent}`);
    });
    
    // Send to your backend, display in UI, etc.
    processSelectedThreads(selected);
  }
});

await scraper.run();

function processSelectedThreads(items) {
  // Your custom logic here
  const payload = items.map(item => ({
    type: item.type,
    content: item.textContent,
    url: item.URL
  }));
  
  fetch('/api/process-threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### Chrome Extension Content Script

```typescript
// content-script.ts
import { ContentScraper } from 'threads-harvester';

let scraper: ContentScraper | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startHarvesting') {
    startHarvesting();
    sendResponse({ success: true });
  } else if (message.action === 'getThreads') {
    const content = scraper?.getContent();
    sendResponse({ content });
  } else if (message.action === 'cleanup') {
    cleanup();
    sendResponse({ success: true });
  }
});

async function startHarvesting() {
  try {
    scraper = new ContentScraper({ 
      includeHtml: true,
      showCheckboxes: true 
    });
    
    scraper.on('selectionChanged', (content) => {
      // Send selection updates to background script
      chrome.runtime.sendMessage({
        action: 'threadsSelected',
        content: content
      });
    });
    
    await scraper.run();
  } catch (error) {
    console.error('Thread harvesting failed:', error);
  }
}

function cleanup() {
  if (scraper) {
    scraper.destroy();
    scraper = null;
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
```

## Performance

### Bundle Size
- **Minified**: ~15KB
- **Gzipped**: ~5KB
- **Zero dependencies** - no third-party libraries included
- **Tree-shakable** - only import what you need

### Runtime Performance
- **Minimal DOM impact** - uses efficient selectors and caching
- **Lazy extraction** - content is processed only when needed
- **Memory efficient** - automatic cleanup of event listeners and DOM references
- **Non-blocking** - extraction runs asynchronously without freezing the UI

### Optimization Tips
```typescript
// For better performance on large pages
const scraper = new ContentScraper({ 
  includeHtml: false,  // Skip HTML parsing if only text is needed
  showCheckboxes: false // Delay UI rendering until needed
});

await scraper.run();
// Only show UI when user interacts
if (userWantsToSelect) {
  scraper.displayCheckboxes();
}
```

## Security

### Content Sanitization
- **XSS Protection**: All extracted content is sanitized before processing
- **Safe DOM manipulation**: Uses secure methods for checkbox injection
- **No eval()**: Pure TypeScript implementation without dynamic code execution

### Privacy Considerations
- **No data transmission**: All processing happens locally in the browser
- **No tracking**: No analytics or telemetry collection
- **User consent**: Interactive selection gives users full control over data extraction

### Browser Permissions
```json
// Minimal permissions required for browser extensions
{
  "permissions": ["activeTab"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["threads-harvester.js"]
  }]
}
```

## Browser Compatibility

- Chrome/Chromium 88+
- Firefox 78+  
- Safari 14+
- Edge 88+

## Known Limitations

### Platform-Specific Constraints
- **Dynamic content**: Some platforms with heavy JavaScript rendering may require waiting for content to load
- **Rate limiting**: Rapid successive extractions may be throttled by websites
- **Layout changes**: UI updates on dynamic sites can affect checkbox positioning

### Technical Limitations
- **Cross-origin restrictions**: Cannot extract content from iframes with different origins
- **Mobile browsers**: Touch interactions may behave differently than desktop click events
- **Shadow DOM**: Limited support for content within shadow roots

### Workarounds
```typescript
// For dynamic content, wait before extraction
await new Promise(resolve => setTimeout(resolve, 2000));
const scraper = new ContentScraper();
await scraper.run();

// For mobile, adjust checkbox styling
const mobileStyling: CheckboxStyling = {
  getDefaultStyles: () => `
    width: 30px; height: 30px; /* Larger touch targets */
    /* ... */
  `
};
```

## TypeScript Support

This library is written in TypeScript and includes full type definitions. No additional `@types` packages needed.

```typescript
import { ContentScraper, Content, ContentItem, ScraperOptions } from 'threads-harvester';

// All types are available and fully typed
const options: ScraperOptions = {
  includeHtml: true,
  showCheckboxes: true
};

const scraper: ContentScraper = new ContentScraper(options);
```

## Troubleshooting

### Common Issues

#### Checkboxes Not Appearing
```typescript
// Ensure the page has loaded completely
window.addEventListener('load', async () => {
  const scraper = new ContentScraper({ showCheckboxes: true });
  await scraper.run();
});

// Or wait for dynamic content
await new Promise(resolve => setTimeout(resolve, 1000));
```

#### Content Not Extracted
```typescript
// Check if the platform is supported
const content = scraper.getContent();
if (!content || content.items.length === 0) {
  console.log('Current URL:', window.location.href);
  console.log('Detected platform:', /* add platform detection debug */);
}

// Force generic extractor for unsupported sites
const scraper = new ContentScraper();
// Manual extraction logic here
```

#### Performance Issues on Large Pages
```typescript
// Optimize for large pages
const scraper = new ContentScraper({ 
  includeHtml: false,
  showCheckboxes: false  // Add checkboxes later
});

await scraper.run();

// Show UI only when needed
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'h') { // Ctrl+H to show
    scraper.displayCheckboxes();
  }
});
```

#### Memory Leaks
```typescript
// Always cleanup when done
const scraper = new ContentScraper();
try {
  await scraper.run();
  // Use the scraper...
} finally {
  scraper.destroy(); // Essential for cleanup
}

// For SPAs, cleanup on route changes
router.beforeEach(() => {
  if (globalScraper) {
    globalScraper.destroy();
    globalScraper = null;
  }
});
```

### Debug Mode
```typescript
// Enable detailed logging (if available in your build)
const scraper = new ContentScraper({ 
  debug: true  // Logs extraction steps
});

// Check what was extracted
const content = scraper.getContent();
console.table(content?.items.map(item => ({
  type: item.type,
  text: item.textContent?.substring(0, 50),
  selected: item.selected
})));
```

## FAQ

### General Questions

**Q: Does this work with single-page applications (SPAs)?**  
A: Yes, but you may need to re-run extraction after route changes or dynamic content updates.

**Q: Can I extract content from password-protected or private discussions?**  
A: Only if the content is already visible in your browser. The library respects all authentication and visibility constraints.

**Q: Does this work in Node.js?**  
A: No, this is a browser-only library that requires DOM access. For server-side scraping, consider using Puppeteer or similar tools.

**Q: How do I handle infinite scroll content?**  
A: Trigger scrolling before extraction, or re-run extraction after new content loads:

```typescript
// Scroll to load more content
window.scrollTo(0, document.body.scrollHeight);
await new Promise(resolve => setTimeout(resolve, 2000));

// Re-extract with new content
await scraper.run();
```

### Technical Questions

**Q: Why are checkboxes positioned incorrectly?**  
A: This can happen on sites with complex CSS or dynamic layouts. Customize positioning:

```typescript
const customStyling: CheckboxStyling = {
  getPositioningStyles: (targetRect) => ({
    top: `${targetRect.top + window.pageYOffset - 10}px`,
    left: `${targetRect.left + window.pageXOffset - 40}px`
  })
};
```

**Q: Can I extract content from embedded social media widgets?**  
A: Limited support due to cross-origin restrictions. The library works best with native platform content.

**Q: How do I handle content that loads via AJAX?**  
A: Wait for content to load, or use MutationObserver to detect changes:

```typescript
const observer = new MutationObserver(() => {
  // Re-run extraction when DOM changes
  scraper.run();
});
observer.observe(document.body, { childList: true, subtree: true });
```

### Browser Extension Questions

**Q: What permissions does my extension need?**  
A: Minimal permissions - typically just `activeTab` and content script access.

**Q: How do I handle content security policies (CSP)?**  
A: Ensure your manifest.json includes appropriate CSP directives for dynamic styling.

## Development

### Setup
```bash
git clone https://github.com/your-username/threads-harvester.git
cd threads-harvester
npm install
```

### Building
```bash
npm run build          # Production build
npm run build:dev      # Development build with source maps
npm run watch          # Watch mode for development
```

### Testing
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
npm run test:coverage # Coverage report
```

### Development Server
```bash
npm run dev           # Start development server
# Open test pages at http://localhost:3000
```

### Code Quality
```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run type-check    # TypeScript checking
```

### Testing on Different Sites
```bash
# Test servers for different platforms
npm run test:reddit   # Reddit-like interface
npm run test:hn       # HackerNews-like interface  
npm run test:twitter  # Twitter-like interface
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-platform-extractor`
3. Make your changes and add tests
4. Commit using conventional commits: `git commit -m "feat: add LinkedIn discussion extractor"`
5. Push and create a Pull Request

### Adding New Platform Extractors

To add support for a new discussion platform:

1. Create a new extractor class extending `BaseExtractor`
2. Implement the `extract()` method with platform-specific logic
3. Add platform detection logic to `ContentScraper` constructor
4. Add comprehensive tests for the new extractor

```typescript
// src/extractors/linkedin.ts
import { BaseExtractor } from './base';
import { Content, ContentItem } from '../types';

export class LinkedInExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    // Implementation for LinkedIn discussion threads
    return {
      pageURL: window.location.href,
      title: document.title,
      items: [] // Your extracted posts and comments
    };
  }
}
```

## License

MIT License - see LICENSE file for details.