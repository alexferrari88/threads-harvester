import { UIManager } from './ui-manager.js';
import { BaseExtractor } from './extractors/base.js';
import { Content, ScraperOptions } from './types.js';
import { GenericExtractor } from './extractors/generic.js';
import { HackerNewsExtractor } from './extractors/hackernews.js';
import { RedditExtractor } from './extractors/reddit.js';
import { TwitterExtractor } from './extractors/twitter.js';

export class ContentScraper {
  private extractor: BaseExtractor;
  private uiManager: UIManager;
  private content: Content | null = null;
  private eventEmitter = new EventTarget();
  private options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = options;
    // Detect the current site from window.location.href
    const url = window.location.href;
    
    if (url.includes('news.ycombinator.com')) {
      this.extractor = new HackerNewsExtractor(options.includeHtml || false);
    } else if (url.includes('reddit.com')) {
      this.extractor = new RedditExtractor(options.includeHtml || false);
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      this.extractor = new TwitterExtractor(options.includeHtml || false);
    } else {
      this.extractor = new GenericExtractor(options.includeHtml || false);
    }

    // Instantiate the UIManager with custom styling from options
    this.uiManager = new UIManager(options.checkboxStyling);
    
    // Set up UI event listeners
    this.uiManager.on('selectionChanged', (selectedItems) => {
      if (this.content) {
        // Update content items selection state
        this.content.items.forEach(item => {
          item.selected = selectedItems.some(selected => selected.id === item.id);
        });
        
        // Emit selection changed event
        this.eventEmitter.dispatchEvent(new CustomEvent('selectionChanged', {
          detail: this.content
        }));
      }
    });
  }

  public async run(): Promise<void> {
    try {
      // Call extractor to get the initial content
      this.content = await this.extractor.extract();
      
      // If content has items and showCheckboxes is enabled, display checkboxes
      if (this.content && this.content.items.length > 0 && this.options.showCheckboxes) {
        this.uiManager.displayCheckboxes(this.content.items);
      }
    } catch (error) {
      console.error('ContentScraper error:', error);
      throw error;
    }
  }

  public displayCheckboxes(): void {
    // Public method to display checkboxes regardless of the showCheckboxes option
    if (this.content && this.content.items.length > 0) {
      this.uiManager.displayCheckboxes(this.content.items);
    }
  }

  public getContent(): Content | null {
    // Return a deep copy of the currently selected content
    if (!this.content) return null;
    
    return {
      pageURL: this.content.pageURL,
      title: this.content.title,
      items: this.content.items.map(item => ({
        ...item,
        // Note: element references can't be deep copied
        element: item.element
      }))
    };
  }

  public on(eventName: 'selectionChanged', callback: (content: Content) => void): void {
    this.eventEmitter.addEventListener(eventName, (event: any) => {
      callback(event.detail);
    });
  }

  public destroy(): void {
    // Clean up: remove UI, remove event listeners
    this.uiManager.destroy();
    this.content = null;
  }
}

// Export types and constants for consumers
export * from './types.js';
export * from './extractors/base.js';
export * from './constants.js';