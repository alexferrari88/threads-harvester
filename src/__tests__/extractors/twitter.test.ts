import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwitterExtractor } from '../../extractors/twitter';
import { SITE_SELECTORS } from '../../constants';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://x.com/iannuttall/status/1945060688319197210'
  },
  writable: true
});

describe('TwitterExtractor', () => {
  let extractor: TwitterExtractor;

  beforeEach(() => {
    extractor = new TwitterExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Twitter Page';
    
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
      const extractorWithHtml = new TwitterExtractor(true);
      const extractorWithoutHtml = new TwitterExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(TwitterExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(TwitterExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Twitter Post';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://x.com/iannuttall/status/1945060688319197210');
      expect(result.title).toBe('Twitter Post');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title when document.title is empty', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Twitter/X');
    });

    it('should extract tweets using article[data-testid="tweet"] selector', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>This is a tweet with enough content to be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toContain('This is a tweet');
      expect(result.items[0].selected).toBe(false);
    });

    it('should extract tweets using direct tweetText selector', async () => {
      document.body.innerHTML = `
        <div data-testid="tweetText">
          <span>Direct tweet text content that should be extracted.</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Direct tweet text content');
    });

    it('should extract tweets using article[role="article"] selector', async () => {
      document.body.innerHTML = `
        <article role="article">
          <div>
            <span>Tweet content in role article that should be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Tweet content in role article');
    });

    it('should extract tweets using .tweet-text class selector', async () => {
      document.body.innerHTML = `
        <div class="tweet-text">
          <span>Tweet with class-based selector that should be extracted.</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Tweet with class-based selector');
    });

    it('should extract tweets using .twitter-tweet class selector', async () => {
      document.body.innerHTML = `
        <div class="twitter-tweet">
          <span>Embedded tweet content that should be extracted properly.</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Embedded tweet content');
    });

    it('should prioritize selectors in order', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Primary tweet article content</span>
          </div>
        </article>
        <div data-testid="tweetText">
          <span>Secondary direct tweet text</span>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Primary tweet article content');
    });

    it('should find tweet text within article elements', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div class="tweet-header">User info</div>
          <div data-testid="tweetText">
            <span>Actual tweet content that should be extracted.</span>
          </div>
          <div class="tweet-actions">Actions</div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Actual tweet content');
    });

    it('should ignore tweets that are too short', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Hi</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>This tweet is long enough to be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This tweet is long enough');
    });

    it('should ignore hidden tweets', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet" style="display: none;">
          <div data-testid="tweetText">
            <span>Hidden tweet that should not be extracted.</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Visible tweet that should be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Visible tweet');
    });

    it('should fall back to general article extraction when no specific tweets found', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <p>This is article content that should be extracted as fallback when no specific tweet selectors match.</p>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This is article content');
    });

    it('should filter fallback articles by length (20-2000 chars)', async () => {
      document.body.innerHTML = `
        <article>
          <div>Short content</div>
        </article>
        <article>
          <div>${'Very long content that exceeds the maximum length limit. '.repeat(100)}</div>
        </article>
        <article>
          <div>This article has the right length to be extracted as fallback content.</div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This article has the right length');
    });

    it('should extract multiple tweets', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>First tweet content that should be extracted.</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Second tweet content that should also be extracted.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('First tweet content');
      expect(result.items[1].textContent).toContain('Second tweet content');
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new TwitterExtractor(true);
      
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Tweet with <a href="#">hashtags</a> and <strong>formatting</strong>.</span>
          </div>
        </article>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<a href="#">hashtags</a>');
      expect(result.items[0].htmlContent).toContain('<strong>formatting</strong>');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Tweet with <a href="#">hashtags</a> and <strong>formatting</strong>.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
    });

    it('should generate unique IDs for different tweets', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>First unique tweet content.</span>
          </div>
        </article>
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Second unique tweet content.</span>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
    });

    it('should handle complex nested Twitter structures', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div class="tweet-header">
            <div class="user-info">@username</div>
            <div class="timestamp">2h</div>
          </div>
          <div data-testid="tweetText">
            <span>Main tweet content with </span>
            <a href="#">@mentions</a>
            <span> and </span>
            <a href="#">#hashtags</a>
            <span> that should all be extracted.</span>
          </div>
          <div class="tweet-actions">
            <button>Reply</button>
            <button>Retweet</button>
            <button>Like</button>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Main tweet content');
      expect(result.items[0].textContent).toContain('@mentions');
      expect(result.items[0].textContent).toContain('#hashtags');
    });

    it('should handle empty Twitter page gracefully', async () => {
      document.body.innerHTML = `
        <nav class="twitter-nav">Navigation</nav>
        <aside class="sidebar">Sidebar content</aside>
        <footer>Footer</footer>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(0);
      expect(result.pageURL).toBe('https://x.com/iannuttall/status/1945060688319197210');
      expect(result.title).toBe('Test Twitter Page');
    });

    it('should prefer specific tweet selectors over fallback', async () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="tweetText">
            <span>Specific tweet content</span>
          </div>
        </article>
        <article>
          <div>Fallback article content that should not be extracted when specific tweets exist.</div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Specific tweet content');
    });
  });

  describe('Real Twitter DOM Structure Tests', () => {
    it('should extract text from realistic complex Twitter DOM structure', async () => {
      // Based on actual Twitter DOM structure observed in x.com/iannuttall/status/1945060688319197210
      // Focus on text extraction from complex nested structures
      document.body.innerHTML = `
        <main>
          <region>
            <article>
              <div>
                <div>
                  <div>
                    <link href="/iannuttall">
                      <div>
                        <div>Ian Nuttall</div>
                        <img alt="Verified account" />
                      </div>
                    </link>
                    <link href="/iannuttall">
                      <div>@iannuttall</div>
                    </link>
                  </div>
                </div>
                <div>Claude Code seems to have been a bit "dumber" the past few days and just making stupid mistakes. I legit would pay $500/mo to just have the good version that never gets a quantized/degraded during peak times!</div>
                <div>
                  <link href="/iannuttall/status/1945060688319197210">
                    <time>11:59 AM · Jul 15, 2025</time>
                  </link>
                  <div>
                    <div>224.2K Views</div>
                  </div>
                </div>
                <div>
                  <button>247 Replies</button>
                  <button>86 Reposts</button>
                  <button>1484 Likes</button>
                </div>
              </div>
            </article>
          </region>
        </main>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Claude Code seems to have been a bit "dumber"');
      expect(result.items[0].textContent).toContain('$500/mo');
      expect(result.items[0].textContent).toContain('quantized/degraded during peak times');
    });

    it('should extract text from deeply nested Twitter thread structure', async () => {
      // Test extraction from multiple tweets in complex nested structure
      document.body.innerHTML = `
        <main>
          <region>
            <article>
              <div>
                <div>
                  <div>
                    <div>Ian Nuttall</div>
                    <div>@iannuttall</div>
                  </div>
                </div>
                <div>This is the main tweet content that should be extracted correctly.</div>
                <div>
                  <button>247 Replies</button>
                  <button>86 Reposts</button>
                  <button>1484 Likes</button>
                </div>
              </div>
            </article>
            <article>
              <div>
                <div>
                  <div>
                    <div>Ahmer Sultan</div>
                    <div>@cyphorous</div>
                    <time>21h</time>
                  </div>
                </div>
                <div>I don't think it's Claude Code - it's Sonnet 4. Happening on Cursor too.</div>
                <div>
                  <button>5 Replies</button>
                  <button>53 Likes</button>
                  <div>13K Views</div>
                </div>
              </div>
            </article>
          </region>
        </main>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('main tweet content');
      expect(result.items[1].textContent).toContain('Sonnet 4');
      expect(result.items[1].textContent).toContain('Happening on Cursor too');
    });

    it('should extract text from tweets with mixed content types', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>Username</div>
              <div>@handle</div>
            </div>
            <div>
              <div>Check out this link: https://example.com and this #hashtag</div>
              <div>Also mentioning @someone else in the tweet</div>
            </div>
            <div>
              <button>Reply</button>
              <button>Repost</button>
              <button>Like</button>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('https://example.com');
      expect(result.items[0].textContent).toContain('#hashtag');
      expect(result.items[0].textContent).toContain('@someone else');
    });

    it('should handle tweets with script and style elements correctly', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>Valid tweet content here</div>
              <script>console.log('should be filtered out');</script>
              <style>.hidden { display: none; }</style>
            </div>
            <div>More valid content</div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Valid tweet content here');
      expect(result.items[0].textContent).toContain('More valid content');
      expect(result.items[0].textContent).not.toContain('console.log');
      expect(result.items[0].textContent).not.toContain('display: none');
    });

    it('should extract text from tweets with many nested divs and spans', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>
                <div>
                  <span>
                    <div>
                      <span>This is deeply nested content</span>
                      <div>
                        <span>with multiple levels</span>
                      </div>
                    </div>
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div>
                <div>
                  <span>And this is more content</span>
                  <div>
                    <span>in a complex structure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('deeply nested content');
      expect(result.items[0].textContent).toContain('multiple levels');
      expect(result.items[0].textContent).toContain('more content');
      expect(result.items[0].textContent).toContain('complex structure');
    });

    it('should handle malformed or empty article structures gracefully', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div></div>
            </div>
            <div></div>
            <div>
              <button>0 Replies</button>
            </div>
          </div>
        </article>
        <article>
          <div>
            <div>Valid tweet content that should be extracted.</div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Valid tweet content');
    });

    it('should handle truncated content with Show more button', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>This is a long tweet that has been truncated...</div>
              <button data-testid="tweet-text-show-more-link">Show more</button>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('long tweet that has been truncated');
      expect(result.items[0].textContent).toContain('Show more');
    });

    it('should handle large thread structures efficiently', async () => {
      // Create a large thread structure to test performance
      const articles = [];
      for (let i = 0; i < 50; i++) {
        articles.push(`
          <article>
            <div>
              <div>
                <div>User ${i}</div>
                <div>@user${i}</div>
              </div>
              <div>This is tweet number ${i} with some content that should be extracted properly.</div>
              <div>
                <button>${i} Replies</button>
                <button>${i * 2} Likes</button>
              </div>
            </div>
          </article>
        `);
      }
      
      document.body.innerHTML = `
        <main>
          <region>
            ${articles.join('')}
          </region>
        </main>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(50);
      expect(result.items[0].textContent).toContain('tweet number 0');
      expect(result.items[49].textContent).toContain('tweet number 49');
    });

    it('should handle tweets with special characters and Unicode', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>Tweet with special chars: "quotes" 'apostrophes' & ampersands</div>
              <div>Unicode: 🚀 🎉 💻 中文字符 العربية Русский</div>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('special chars');
      expect(result.items[0].textContent).toContain('🚀 🎉 💻');
      expect(result.items[0].textContent).toContain('中文字符');
      expect(result.items[0].textContent).toContain('العربية');
      expect(result.items[0].textContent).toContain('Русский');
    });

    it('should handle tweets with line breaks and whitespace', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>First line of tweet
              
              Second line with line breaks
              
              Third line</div>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('First line of tweet');
      expect(result.items[0].textContent).toContain('Second line with line breaks');
      expect(result.items[0].textContent).toContain('Third line');
    });

    it('should handle tweets with embedded media placeholders', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>Check out this image:</div>
              <div>
                <img src="placeholder.jpg" alt="Embedded image" />
              </div>
              <div>And this video:</div>
              <div>
                <video>
                  <source src="video.mp4" type="video/mp4" />
                </video>
              </div>
              <div>Great content!</div>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Check out this image');
      expect(result.items[0].textContent).toContain('And this video');
      expect(result.items[0].textContent).toContain('Great content');
    });

    it('should handle tweets with malformed HTML gracefully', async () => {
      document.body.innerHTML = `
        <article>
          <div>
            <div>
              <div>Valid content before malformed HTML</div>
              <div><span>Unclosed span and <div>mixed tags</span></div>
              <div>Valid content after malformed HTML</div>
            </div>
          </div>
        </article>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Valid content before malformed');
      expect(result.items[0].textContent).toContain('Unclosed span and');
      expect(result.items[0].textContent).toContain('mixed tags');
      expect(result.items[0].textContent).toContain('Valid content after malformed');
    });
  });
});