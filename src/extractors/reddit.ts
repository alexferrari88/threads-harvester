import { BaseExtractor } from './base.js';
import { Content, ContentItem } from '../types.js';
import { SITE_SELECTORS } from '../constants.js';

export class RedditExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Reddit',
      items: []
    };

    // Use the correct Reddit comment selector from constants
    let commentElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.COMMENTS) as NodeListOf<HTMLElement>;

    commentElements.forEach((commentEl) => {
      if (this.isElementVisible(commentEl)) {
        const textContent = this.extractTextFromElement(commentEl);
        
        if (textContent && textContent.length > 5) {
          const item: ContentItem = {
            id: this.generateId(textContent),
            element: commentEl,
            textContent,
            htmlContent: this.includeHtml ? commentEl.innerHTML : undefined,
            type: 'comment',
            URL: (document.querySelector(SITE_SELECTORS.REDDIT.COMMENT_ID) as HTMLAnchorElement)?.href,
            selected: false
          };
          content.items.push(item);
        }
      }
    });

    // Also extract posts (both posts and comments should be available for selection)
    let postElements = document.querySelectorAll(SITE_SELECTORS.REDDIT.POST) as NodeListOf<HTMLElement>;

    postElements.forEach((postEl) => {
      if (this.isElementVisible(postEl)) {
        const textContent = this.extractTextFromElement(postEl);
        
        if (textContent && textContent.length > 5) {
          const item: ContentItem = {
            id: this.generateId(textContent),
            element: postEl,
            textContent,
            htmlContent: this.includeHtml ? postEl.innerHTML : undefined,
            type: 'post',
            URL: window.location.href,
            selected: false
          };
          content.items.push(item);
        }
      }
    });

    return content;
  }
}