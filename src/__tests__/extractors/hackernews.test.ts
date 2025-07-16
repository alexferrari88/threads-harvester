import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HackerNewsExtractor } from '../../extractors/hackernews';
import { SITE_SELECTORS } from '../../constants';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://news.ycombinator.com/item?id=36971003'
  },
  writable: true
});

describe('HackerNewsExtractor', () => {
  let extractor: HackerNewsExtractor;

  beforeEach(() => {
    extractor = new HackerNewsExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test HN Page';
    
    // Mock DOM APIs for visibility checking
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => {}
    }));
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return document.body; }, configurable: true
    });
    window.getComputedStyle = vi.fn(() => ({
      display: 'block', visibility: 'visible'
    } as CSSStyleDeclaration));
  });

  describe('constructor', () => {
    it('should initialize with includeHtml option', () => {
      const extractorWithHtml = new HackerNewsExtractor(true);
      const extractorWithoutHtml = new HackerNewsExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(HackerNewsExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(HackerNewsExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Hacker News Discussion';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://news.ycombinator.com/item?id=36971003');
      expect(result.title).toBe('Hacker News Discussion');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title when document.title is empty', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Hacker News');
    });

    it('should extract comments from comment tree structure', async () => {
      document.body.innerHTML = `
        <table border="0" class="comment-tree">
          <tr class="athing comtr" id="36971636">
            <td>
              <table border="0">
                <tr>
                  <td class="ind" indent="0"><img src="s.gif" height="1" width="0"></td>
                  <td class="default">
                    <div class="comhead">
                      <a href="user?id=sebastiennight" class="hnuser">sebastiennight</a>
                      <span class="age">
                        <a href="item?id=36971636">on Aug 2, 2023</a>
                      </span>
                    </div>
                    <div class="comment">
                      <div class="commtext c00">
                        This is a comment with enough content to be extracted.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('This is a comment');
      expect(result.items[0].selected).toBe(false);
      expect(result.items[0].element.classList.contains('comtr')).toBe(true);
      expect(result.items[0].URL).toBe('http://localhost:3000/item?id=36971636');
    });

    it('should extract multiple comments', async () => {
      document.body.innerHTML = `
        <table border="0" class="comment-tree">
          <tr class="athing comtr" id="36971636">
            <td>
              <table border="0">
                <tr>
                  <td class="ind" indent="0"><img src="s.gif" height="1" width="0"></td>
                  <td class="default">
                    <div class="comhead">
                      <a href="user?id=user1" class="hnuser">user1</a>
                      <span class="age">
                        <a href="item?id=36971636">on Aug 2, 2023</a>
                      </span>
                    </div>
                    <div class="comment">
                      <div class="commtext c00">
                        First comment content that is long enough.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="athing comtr" id="36972493">
            <td>
              <table border="0">
                <tr>
                  <td class="ind" indent="0"><img src="s.gif" height="1" width="0"></td>
                  <td class="default">
                    <div class="comhead">
                      <a href="user?id=user2" class="hnuser">user2</a>
                      <span class="age">
                        <a href="item?id=36972493">on Aug 2, 2023</a>
                      </span>
                    </div>
                    <div class="comment">
                      <div class="commtext c00">
                        Second comment content that is also long enough.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('First comment content');
      expect(result.items[1].textContent).toContain('Second comment content');
      expect(result.items[0].type).toBe('comment');
      expect(result.items[1].type).toBe('comment');
      expect(result.items[0].URL).toBe('http://localhost:3000/item?id=36971636');
      expect(result.items[1].URL).toBe('http://localhost:3000/item?id=36972493');
    });

    it('should ignore comments that are too short', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">Short</div>
          </div>
          <div class="comtr">
            <div class="commtext">This comment is long enough to be extracted.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This comment is long enough');
    });

    it('should ignore hidden comments', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext" style="display: none;">Hidden comment content that would be long enough.</div>
          </div>
          <div class="comtr">
            <div class="commtext">Visible comment content that is long enough.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Visible comment content');
    });

    it('should extract text posts with content', async () => {
      document.body.innerHTML = `
        <div class="toptext">
          This is the main post content with enough text to be extracted properly.
        </div>
        <div class="subtext">
          <span class="age">
            <a href="https://news.ycombinator.com/item?id=36971003">2 hours ago</a>
          </span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toContain('This is the main post content');
      expect(result.items[0].URL).toBe('https://news.ycombinator.com/item?id=36971003');
    });

    it('should extract stories when no comments are found', async () => {
      document.body.innerHTML = `
        <table class="fatitem" border="0">
          <tr class="athing submission" id="36971003">
            <td align="right" valign="top" class="title">
              <span class="rank"></span>
            </td>
            <td class="title">
              <span class="titleline">
                <a href="https://example.com/story">An Interesting Story Title</a>
                <span class="sitebit comhead">
                  (<a href="from?site=example.com"><span class="sitestr">example.com</span></a>)
                </span>
              </span>
            </td>
          </tr>
          <tr>
            <td colspan="2"></td>
            <td class="subtext">
              <span class="subline">
                <span class="score">243 points</span> by 
                <a href="user?id=tosh" class="hnuser">tosh</a>
                <span class="age">
                  <a href="https://news.ycombinator.com/item?id=36971003">2 hours ago</a>
                </span>
              </span>
            </td>
          </tr>
        </table>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toBe('An Interesting Story Title');
      expect(result.items[0].URL).toBe('https://news.ycombinator.com/item?id=36971003');
      expect(result.items[0].element.classList.contains('athing')).toBe(true);
    });

    it('should extract main story with multiple title links present', async () => {
      document.body.innerHTML = `
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story1">Main Story Title</a>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story2">Related Story Title</a>
          </div>
        </div>
        <div class="subtext">
          <span class="age">
            <a href="https://news.ycombinator.com/item?id=36971003">2 hours ago</a>
          </span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toBe('Main Story Title');
      expect(result.items[0].URL).toBe('https://news.ycombinator.com/item?id=36971003');
      expect(result.items[0].type).toBe('post');
    });

    it('should ignore hidden stories', async () => {
      document.body.innerHTML = `
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story1" style="display: none;">Hidden Story</a>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story2">Visible Story</a>
          </div>
        </div>
        <div class="subtext">
          <span class="age">
            <a href="https://news.ycombinator.com/item?id=36971003">2 hours ago</a>
          </span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toBe('Visible Story');
    });

    it('should extract both main story and comments', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">Comment content that is long enough.</div>
            <div class="comhead">
              <span class="age">
                <a href="https://news.ycombinator.com/item?id=456">1 hour ago</a>
              </span>
            </div>
          </div>
        </div>
        <div class="athing">
          <div class="titleline">
            <a href="https://example.com/story">Story Title</a>
          </div>
        </div>
        <div class="subtext">
          <span class="age">
            <a href="https://news.ycombinator.com/item?id=36971003">2 hours ago</a>
          </span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toBe('Story Title');
      expect(result.items[0].URL).toBe('https://news.ycombinator.com/item?id=36971003');
      expect(result.items[1].type).toBe('comment');
      expect(result.items[1].textContent).toContain('Comment content');
      expect(result.items[1].URL).toBe('https://news.ycombinator.com/item?id=456');
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new HackerNewsExtractor(true);
      
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <p>Comment with <a href="#">link</a> and formatting.</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<p>Comment with <a href="#">link</a>');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <p>Comment with <a href="#">link</a> and formatting.</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
    });

    it('should generate unique IDs for different items', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">First comment content that is long enough.</div>
          </div>
          <div class="comtr">
            <div class="commtext">Second comment content that is different and long enough.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
    });

    it('should handle nested comment structures', async () => {
      document.body.innerHTML = `
        <div class="comment-tree">
          <div class="comtr">
            <div class="commtext">
              <div>
                <span>Nested comment content with multiple elements that is long enough.</span>
                <div>Additional nested content</div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Nested comment content');
      expect(result.items[0].textContent).toContain('Additional nested content');
    });

    it('should handle mixed comments and stories scenario (short comments ignored)', async () => {
      // Comments exist but are too short, should still extract main story
      document.body.innerHTML = `
        <table border="0" class="comment-tree">
          <tr class="athing comtr" id="36971636">
            <td>
              <table border="0">
                <tr>
                  <td class="ind" indent="0"><img src="s.gif" height="1" width="0"></td>
                  <td class="default">
                    <div class="comment">
                      <div class="commtext c00">Short</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table class="fatitem" border="0">
          <tr class="athing submission" id="36971003">
            <td class="title">
              <span class="titleline">
                <a href="https://example.com/story">Story Title</a>
              </span>
            </td>
          </tr>
          <tr>
            <td class="subtext">
              <span class="age">
                <a href="https://news.ycombinator.com/item?id=36971003">2 hours ago</a>
              </span>
            </td>
          </tr>
        </table>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toBe('Story Title');
      expect(result.items[0].URL).toBe('https://news.ycombinator.com/item?id=36971003');
    });

    it('should handle nested comment threads with proper indentation', async () => {
      document.body.innerHTML = `
        <table border="0" class="comment-tree">
          <tr class="athing comtr" id="36971636">
            <td>
              <table border="0">
                <tr>
                  <td class="ind" indent="0"><img src="s.gif" height="1" width="0"></td>
                  <td class="default">
                    <div class="comhead">
                      <a href="user?id=user1" class="hnuser">user1</a>
                      <span class="age">
                        <a href="item?id=36971636">on Aug 2, 2023</a>
                      </span>
                    </div>
                    <div class="comment">
                      <div class="commtext c00">
                        This is a parent comment with enough content to be extracted.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr class="athing comtr" id="36972493">
            <td>
              <table border="0">
                <tr>
                  <td class="ind" indent="1"><img src="s.gif" height="1" width="40"></td>
                  <td class="default">
                    <div class="comhead">
                      <a href="user?id=user2" class="hnuser">user2</a>
                      <span class="age">
                        <a href="item?id=36972493">on Aug 2, 2023</a>
                      </span>
                    </div>
                    <div class="comment">
                      <div class="commtext c00">
                        This is a nested reply comment with enough content to be extracted.
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('This is a parent comment');
      expect(result.items[1].textContent).toContain('This is a nested reply comment');
      expect(result.items[0].type).toBe('comment');
      expect(result.items[1].type).toBe('comment');
      expect(result.items[0].URL).toBe('http://localhost:3000/item?id=36971636');
      expect(result.items[1].URL).toBe('http://localhost:3000/item?id=36972493');
    });
  });
});