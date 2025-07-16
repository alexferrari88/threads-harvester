import { BaseExtractor } from './base.js';
import { Content, ContentItem } from '../types.js';
import { SITE_SELECTORS } from '../constants.js';

export class HackerNewsExtractor extends BaseExtractor {
  public async extract(): Promise<Content> {
    const content: Content = {
      pageURL: window.location.href,
      title: document.title || 'Hacker News',
      items: []
    };

    // 1. Extract the main submission first
    const mainPost = document.querySelector(SITE_SELECTORS.HACKER_NEWS.POST);
    if (mainPost && this.isElementVisible(mainPost)) {
      // Text post - extract from .toptext
      const textContent = this.extractTextFromElement(mainPost);
      const postUrlEl = document.querySelector(SITE_SELECTORS.HACKER_NEWS.POST_ID) as HTMLAnchorElement;
      
      if (textContent && textContent.length > 10) {
        const item: ContentItem = {
          id: this.generateId(textContent),
          element: mainPost as HTMLElement,
          URL: postUrlEl?.href,
          textContent,
          htmlContent: this.includeHtml ? mainPost.innerHTML : undefined,
          type: 'post',
          selected: false
        };
        content.items.push(item);
      }
    } else {
      // URL-only submission - extract from .titleline > a (find first visible one)
      const titleLinkElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.TITLE_LINK) as NodeListOf<HTMLAnchorElement>;
      for (const titleLinkEl of titleLinkElements) {
        if (this.isElementVisible(titleLinkEl)) {
          const textContent = this.extractTextFromElement(titleLinkEl);
          const postUrlEl = document.querySelector(SITE_SELECTORS.HACKER_NEWS.POST_ID) as HTMLAnchorElement;
          
          if (textContent) {
            const item: ContentItem = {
              id: this.generateId(textContent),
              element: titleLinkEl.closest('.athing') as HTMLElement || titleLinkEl,
              URL: postUrlEl?.href,
              textContent,
              htmlContent: this.includeHtml ? titleLinkEl.outerHTML : undefined,
              type: 'post',
              selected: false
            };
            content.items.push(item);
            break; // Only extract the first visible title link
          }
        }
      }
    }

    // 2. Extract all comments
    const commentElements = document.querySelectorAll(SITE_SELECTORS.HACKER_NEWS.COMMENT_TREE) as NodeListOf<HTMLElement>;
    
    commentElements.forEach((commentEl) => {
      const commentContent = commentEl.querySelector(SITE_SELECTORS.HACKER_NEWS.COMMENTS);
      if (commentContent && this.isElementVisible(commentContent)) {
        const textContent = this.extractTextFromElement(commentContent);
        const commentUrlEl = commentEl.querySelector(SITE_SELECTORS.HACKER_NEWS.COMMENT_ID) as HTMLAnchorElement;
        
        if (textContent && textContent.length > 10) {
          const item: ContentItem = {
            id: this.generateId(textContent),
            element: commentEl,
            URL: commentUrlEl?.href,
            textContent,
            htmlContent: this.includeHtml ? commentContent.innerHTML : undefined,
            type: 'comment',
            selected: false
          };
          content.items.push(item);
        }
      }
    });

    return content;
  }
}