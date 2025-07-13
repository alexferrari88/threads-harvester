# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library for extracting threaded content from discussion platforms like Reddit, Twitter, and Hacker News. It provides interactive selection UI and site-specific optimizations.

## Development Commands

```bash
# Build the library
npm run build

# Clean build output  
npm run clean

# Testing
npm test                # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Pre-publish
npm run prepublishOnly  # Clean and build for publishing
```

## Architecture

### Core Components

- **ContentScraper** (`src/index.ts`) - Main entry point that orchestrates extraction and UI
- **BaseExtractor** (`src/extractors/base.ts`) - Abstract base class with common extraction utilities
- **Platform Extractors** (`src/extractors/`) - Site-specific content extraction logic:
  - `hackernews.ts` - Hacker News posts and threaded comments
  - `reddit.ts` - Reddit posts and nested comment threads  
  - `twitter.ts` - Twitter/X tweets and reply threads
  - `generic.ts` - Fallback extractor for any website
- **UIManager** (`src/ui-manager.ts`) - Handles checkbox overlay UI for content selection
- **Types** (`src/types.ts`) - TypeScript interfaces for Content, ContentItem, ScraperOptions

### Extraction Flow

1. ContentScraper detects current site from window.location.href
2. Instantiates appropriate platform-specific extractor
3. Extractor finds and processes DOM elements into ContentItem[]
4. UIManager optionally displays interactive checkboxes
5. User selections trigger events via EventTarget pattern

### Platform Detection

The library automatically selects extractors based on URL patterns:
- `news.ycombinator.com` → HackerNewsExtractor
- `reddit.com` → RedditExtractor  
- `twitter.com` or `x.com` → TwitterExtractor
- All others → GenericExtractor

## Key Design Patterns

- **Template Method**: BaseExtractor provides common utilities, subclasses implement extract()
- **Strategy**: Different extractors for different platforms
- **Observer**: EventTarget for selection change notifications
- **Factory**: ContentScraper selects appropriate extractor

## Testing

Uses Vitest with happy-dom environment for DOM testing. Tests cover:
- Individual extractor functionality
- UI manager behavior
- Type definitions
- Integration scenarios

Test files mirror source structure in `src/__tests__/`.

## Browser Environment

This is a browser-only library requiring DOM access. Uses modern web APIs:
- TreeWalker for text extraction
- getBoundingClientRect for positioning
- EventTarget for event handling
- Standard DOM manipulation

No external dependencies - pure TypeScript implementation.