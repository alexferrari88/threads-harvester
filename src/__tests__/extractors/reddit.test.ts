import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedditExtractor } from '../../extractors/reddit';
import { SITE_SELECTORS } from '../../constants';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://www.reddit.com/r/programming/comments/abc123/test_post/'
  },
  writable: true
});

describe('RedditExtractor', () => {
  let extractor: RedditExtractor;

  beforeEach(() => {
    extractor = new RedditExtractor(false);
    // Reset DOM
    document.body.innerHTML = '';
    document.title = 'Test Reddit Page';
    
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
      const extractorWithHtml = new RedditExtractor(true);
      const extractorWithoutHtml = new RedditExtractor(false);
      
      expect(extractorWithHtml).toBeInstanceOf(RedditExtractor);
      expect(extractorWithoutHtml).toBeInstanceOf(RedditExtractor);
    });
  });

  describe('extract', () => {
    it('should extract basic page information', async () => {
      document.title = 'Reddit Post Discussion';
      
      const result = await extractor.extract();
      
      expect(result.pageURL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      expect(result.title).toBe('Reddit Post Discussion');
      expect(result.items).toEqual([]);
    });

    it('should use fallback title when document.title is empty', async () => {
      document.title = '';
      
      const result = await extractor.extract();
      
      expect(result.title).toBe('Reddit');
    });

    it('should extract comments using slot="comment" selector', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/abc/"><faceplate-timeago>2 hours ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <p>This is a Reddit comment with enough content to be extracted successfully.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('This is a Reddit comment');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/abc/');
      expect(result.items[0].selected).toBe(false);
    });

    it('should extract posts using slot="text-body" selector', async () => {
      document.body.innerHTML = `
        <div slot="text-body">
          <p>This is a Reddit post content that should be extracted as a post type.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
      expect(result.items[0].textContent).toContain('This is a Reddit post content');
      expect(result.items[0].URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
    });

    it('should extract both comments and posts', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/def/"><faceplate-timeago>1 hour ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <p>This is a comment that should be extracted with enough content.</p>
        </div>
        <div slot="text-body">
          <p>This is a post body that should also be extracted with enough content.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      
      const commentItem = result.items.find(item => item.type === 'comment');
      const postItem = result.items.find(item => item.type === 'post');
      
      expect(commentItem).toBeDefined();
      expect(postItem).toBeDefined();
      expect(commentItem!.textContent).toContain('This is a comment');
      expect(commentItem!.URL).toBe('http://localhost:3000/r/test/comments/123/comment/def/');
      expect(postItem!.textContent).toContain('This is a post body');
      expect(postItem!.URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
    });

    it('should extract multiple comments', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/multi1/"><faceplate-timeago>3 hours ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <p>First comment with sufficient content for extraction.</p>
        </div>
        <div slot="comment">
          <p>Second comment with different content but also long enough.</p>
        </div>
        <div slot="comment">
          <p>Third comment with unique content that meets the length requirement.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3);
      expect(result.items[0].textContent).toContain('First comment');
      expect(result.items[1].textContent).toContain('Second comment');
      expect(result.items[2].textContent).toContain('Third comment');
      expect(result.items.every(item => item.type === 'comment')).toBe(true);
      expect(result.items.every(item => item.URL === 'http://localhost:3000/r/test/comments/123/comment/multi1/')).toBe(true);
    });

    it('should extract multiple posts', async () => {
      document.body.innerHTML = `
        <div slot="text-body">
          <p>First post content with enough text to be extracted.</p>
        </div>
        <div slot="text-body">
          <p>Second post content with different but sufficient text.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].textContent).toContain('First post content');
      expect(result.items[1].textContent).toContain('Second post content');
      expect(result.items.every(item => item.type === 'post')).toBe(true);
      expect(result.items.every(item => item.URL === 'https://www.reddit.com/r/programming/comments/abc123/test_post/')).toBe(true);
    });

    it('should ignore content that is too short', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/ghi/"><faceplate-timeago>30 min ago</faceplate-timeago></a>
        </div>
        <div slot="comment">Short</div>
        <div slot="text-body">Also</div>
        <div slot="comment">
          <p>This comment has enough content to be extracted successfully.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('This comment has enough content');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/ghi/');
    });

    it('should ignore hidden elements', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/visible/"><faceplate-timeago>1 hour ago</faceplate-timeago></a>
        </div>
        <div slot="comment" style="display: none;">
          <p>Hidden comment that should not be extracted even with enough content.</p>
        </div>
        <div slot="comment">
          <p>Visible comment that should be extracted with sufficient content.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('Visible comment');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/visible/');
    });

    it('should include HTML content when includeHtml is true', async () => {
      const extractorWithHtml = new RedditExtractor(true);
      
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/html/"><faceplate-timeago>2 hours ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <p>Comment with <strong>bold</strong> and <em>italic</em> formatting.</p>
        </div>
      `;
      
      const result = await extractorWithHtml.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toContain('<strong>bold</strong>');
      expect(result.items[0].htmlContent).toContain('<em>italic</em>');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/html/');
    });

    it('should not include HTML content when includeHtml is false', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/nohtml/"><faceplate-timeago>3 hours ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <p>Comment with <strong>bold</strong> and <em>italic</em> formatting.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].htmlContent).toBeUndefined();
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/nohtml/');
    });

    it('should generate unique IDs for different items', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/unique1/"><faceplate-timeago>2 hours ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <p>First unique comment content that is long enough.</p>
        </div>
        <div slot="comment">
          <p>Second unique comment content that is also long enough.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).not.toBe(result.items[1].id);
      expect(result.items[0].id).toBeTruthy();
      expect(result.items[1].id).toBeTruthy();
      expect(result.items.every(item => item.URL === 'http://localhost:3000/r/test/comments/123/comment/unique1/')).toBe(true);
    });

    it('should handle complex nested Reddit structures', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/complex/"><faceplate-timeago>1 hour ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="user-info">
              <span class="username">user123</span>
              <span class="score">42 points</span>
            </div>
            <div class="comment-body">
              <p>This is the actual comment text that should be extracted properly.</p>
              <blockquote>Quoted text within the comment</blockquote>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].textContent).toContain('user123');
      expect(result.items[0].textContent).toContain('42 points');
      expect(result.items[0].textContent).toContain('This is the actual comment text');
      expect(result.items[0].textContent).toContain('Quoted text within the comment');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/complex/');
    });

    it('should handle mixed content order correctly', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/mixed/"><faceplate-timeago>2 hours ago</faceplate-timeago></a>
        </div>
        <div slot="text-body">
          <p>Post content that appears first in the DOM structure.</p>
        </div>
        <div slot="comment">
          <p>Comment content that appears second in the DOM structure.</p>
        </div>
        <div slot="text-body">
          <p>Another post that appears third in the DOM structure.</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3);
      
      // Verify the order is preserved and types are correct
      expect(result.items[0].type).toBe('comment'); // Comments are processed first
      expect(result.items[1].type).toBe('post');    // Then posts are processed
      expect(result.items[2].type).toBe('post');
      
      expect(result.items[0].textContent).toContain('Comment content');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/mixed/');
      expect(result.items[1].textContent).toContain('Post content that appears first');
      expect(result.items[1].URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      expect(result.items[2].textContent).toContain('Another post that appears third');
      expect(result.items[2].URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
    });

    it('should handle image posts with only comments (no text-body)', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/pics/comments/123/comment/img1/"><faceplate-timeago>1 hour ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="author">user123</div>
            <div class="comment-text">Great photo! This really shows the scale of the changes being made.</div>
          </div>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="author">anotheruser</div>
            <div class="comment-text">I can't believe they're actually doing this. What a waste of beautiful gardens.</div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.type === 'comment')).toBe(true);
      expect(result.items[0].textContent).toContain('Great photo');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/pics/comments/123/comment/img1/');
      expect(result.items[1].textContent).toContain('I can\'t believe');
      expect(result.items[1].URL).toBe('http://localhost:3000/r/pics/comments/123/comment/img1/');
    });

    it('should handle realistic Reddit comment thread structure', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/politics/comments/123/comment/realistic/"><faceplate-timeago>2 hours ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author">TopLevelUser</span>
              <span class="score">1.2k points</span>
              <span class="age">3 hours ago</span>
            </div>
            <div class="comment-body">
              <p>This is absolutely devastating. The Rose Garden has been a symbol of the presidency for decades.</p>
              <p>Here's what I think about the environmental impact...</p>
            </div>
          </div>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author">ReplyUser</span>
              <span class="score">456 points</span>
              <span class="age">2 hours ago</span>
            </div>
            <div class="comment-body">
              <p>I completely agree with your assessment. The historical significance cannot be overstated.</p>
              <blockquote>Here's what I think about the environmental impact...</blockquote>
              <p>Your point about the environment is spot on. These gardens have been home to...</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.type === 'comment')).toBe(true);
      
      // Check that metadata is included in text content
      expect(result.items[0].textContent).toContain('TopLevelUser');
      expect(result.items[0].textContent).toContain('1.2k points');
      expect(result.items[0].textContent).toContain('devastating');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/politics/comments/123/comment/realistic/');
      
      expect(result.items[1].textContent).toContain('ReplyUser');
      expect(result.items[1].textContent).toContain('456 points');
      expect(result.items[1].textContent).toContain('completely agree');
      expect(result.items[1].URL).toBe('http://localhost:3000/r/politics/comments/123/comment/realistic/');
    });

    it('should handle comments with awards and complex formatting', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/landscaping/comments/123/comment/awards/"><faceplate-timeago>30 min ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author">AwardedUser</span>
              <span class="awards">
                <span class="award gold">Gold x2</span>
                <span class="award silver">Silver x5</span>
              </span>
              <span class="score">5.7k points</span>
            </div>
            <div class="comment-body">
              <p>I'm a landscape architect and I can tell you this is <strong>completely unnecessary</strong>.</p>
              <p>The Rose Garden was designed by <em>Bunny Mellon</em> and has been maintained for:</p>
              <ul>
                <li>Historical preservation</li>
                <li>Environmental sustainability</li>
                <li>Cultural significance</li>
              </ul>
              <p>This decision shows a complete lack of understanding of <code>landscape heritage</code>.</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('AwardedUser');
      expect(result.items[0].textContent).toContain('Gold x2');
      expect(result.items[0].textContent).toContain('landscape architect');
      expect(result.items[0].textContent).toContain('Historical preservation');
      expect(result.items[0].textContent).toContain('landscape heritage');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/landscaping/comments/123/comment/awards/');
    });

    it('should handle empty Reddit page gracefully', async () => {
      document.body.innerHTML = `
        <div class="reddit-header">
          <h1>Reddit</h1>
        </div>
        <div class="sidebar">
          <p>Sidebar content</p>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(0);
      expect(result.pageURL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      expect(result.title).toBe('Test Reddit Page');
    });

    it('should handle image post page structure (no text-body, only comments)', async () => {
      // Simulate a typical image post page like r/pics with image and comments
      document.title = 'Trump is paving the White House Rose Garden : r/pics';
      document.body.innerHTML = `
        <div class="post-header">
          <h1>Trump is paving the White House Rose Garden</h1>
        </div>
        <div class="post-media">
          <img src="/image.jpg" alt="Rose Garden" />
        </div>
        <div class="post-actions">
          <button>Upvote</button>
          <button>Downvote</button>
          <button>Comments</button>
        </div>
        <div class="comments-section">
          <div slot="commentMeta">
            <a href="/r/pics/comments/123/comment/imagepost/"><faceplate-timeago>2 hours ago</faceplate-timeago></a>
          </div>
          <div slot="comment">
            <div class="comment-content">
              <span class="author">concerned_citizen</span>
              <div class="comment-text">This is heartbreaking. The Rose Garden has such historical significance.</div>
            </div>
          </div>
          <div slot="comment">
            <div class="comment-content">
              <span class="author">gardener_pro</span>
              <div class="comment-text">As someone who works with historic gardens, this is devastating. Those plants have been there for decades.</div>
            </div>
          </div>
          <div slot="comment">
            <div class="comment-content">
              <span class="author">political_observer</span>
              <div class="comment-text">I wonder if future administrations will be able to restore it. This seems like such a permanent change.</div>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3);
      expect(result.items.every(item => item.type === 'comment')).toBe(true);
      expect(result.title).toBe('Trump is paving the White House Rose Garden : r/pics');
      
      // Verify specific comment content and URLs
      expect(result.items[0].textContent).toContain('concerned_citizen');
      expect(result.items[0].textContent).toContain('heartbreaking');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/pics/comments/123/comment/imagepost/');
      
      expect(result.items[1].textContent).toContain('gardener_pro');
      expect(result.items[1].textContent).toContain('devastating');
      expect(result.items[1].URL).toBe('http://localhost:3000/r/pics/comments/123/comment/imagepost/');
      
      expect(result.items[2].textContent).toContain('political_observer');
      expect(result.items[2].textContent).toContain('future administrations');
      expect(result.items[2].URL).toBe('http://localhost:3000/r/pics/comments/123/comment/imagepost/');
    });

    it('should handle text post with both post body and comments', async () => {
      // Simulate a text post on Reddit with both original post content and comments
      document.title = 'I was disappointed in Claude after the recent updates : r/Anthropic';
      document.body.innerHTML = `
        <div slot="text-body">
          <div class="post-content">
            <p>I've been using Claude for several months now and I have to say that the recent updates have been disappointing.</p>
            <p>The main issues I've noticed are:</p>
            <ul>
              <li>Response quality has decreased significantly</li>
              <li>The model seems more restrictive now</li>
              <li>Performance has been inconsistent</li>
            </ul>
            <p>Has anyone else experienced similar issues? I'm considering switching to other AI assistants.</p>
          </div>
        </div>
        <div slot="commentMeta">
          <a href="/r/anthropic/comments/123/comment/textpost/"><faceplate-timeago>1 hour ago</faceplate-timeago></a>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author">helpful_user</span>
              <span class="score">23 points</span>
              <span class="age">2 hours ago</span>
            </div>
            <div class="comment-body">
              <p>I haven't noticed the same issues. Are you sure it's not just your specific use case?</p>
              <p>Maybe try adjusting your prompts or approach.</p>
            </div>
          </div>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author">claude_fan</span>
              <span class="score">15 points</span>
              <span class="age">1 hour ago</span>
            </div>
            <div class="comment-body">
              <p>I actually think the recent updates have been great. The responses feel more natural to me.</p>
              <p>Different people have different preferences though!</p>
            </div>
          </div>
        </div>
        <div slot="comment">
          <div class="comment-content">
            <div class="comment-meta">
              <span class="author">tech_expert</span>
              <span class="score">8 points</span>
              <span class="age">45 minutes ago</span>
            </div>
            <div class="comment-body">
              <p>The model updates are always a balancing act. What specific tasks are you finding problematic?</p>
              <p>If you can provide more details, maybe we can help troubleshoot.</p>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(4);
      expect(result.title).toBe('I was disappointed in Claude after the recent updates : r/Anthropic');
      
      // Should have 3 comments and 1 post
      const postItems = result.items.filter(item => item.type === 'post');
      const commentItems = result.items.filter(item => item.type === 'comment');
      
      expect(postItems).toHaveLength(1);
      expect(commentItems).toHaveLength(3);
      
      // Check the post content and URL
      expect(postItems[0].textContent).toContain('I\'ve been using Claude for several months');
      expect(postItems[0].textContent).toContain('Response quality has decreased');
      expect(postItems[0].textContent).toContain('considering switching to other AI assistants');
      expect(postItems[0].URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      
      // Check specific comments and URLs
      expect(commentItems[0].textContent).toContain('helpful_user');
      expect(commentItems[0].textContent).toContain('haven\'t noticed the same issues');
      expect(commentItems[0].URL).toBe('http://localhost:3000/r/anthropic/comments/123/comment/textpost/');
      
      expect(commentItems[1].textContent).toContain('claude_fan');
      expect(commentItems[1].textContent).toContain('recent updates have been great');
      expect(commentItems[1].URL).toBe('http://localhost:3000/r/anthropic/comments/123/comment/textpost/');
      
      expect(commentItems[2].textContent).toContain('tech_expert');
      expect(commentItems[2].textContent).toContain('balancing act');
      expect(commentItems[2].URL).toBe('http://localhost:3000/r/anthropic/comments/123/comment/textpost/');
    });

    it('should handle comments without commentMeta (URL should be undefined)', async () => {
      document.body.innerHTML = `
        <div slot="comment">
          <div class="comment-content">
            <p>Comment without commentMeta structure should have undefined URL.</p>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toContain('Comment without commentMeta');
      expect(result.items[0].URL).toBeUndefined();
    });

    it('should handle edge case with very short content (exactly 5 characters)', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/short/"><faceplate-timeago>1 min ago</faceplate-timeago></a>
        </div>
        <div slot="comment">Hello</div>
        <div slot="comment">Hi</div>
        <div slot="text-body">World</div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(0); // All content is 5 chars or less, but condition is > 5
    });

    it('should handle content with exactly 6 characters (minimum to pass)', async () => {
      document.body.innerHTML = `
        <div slot="commentMeta">
          <a href="/r/test/comments/123/comment/min6/"><faceplate-timeago>1 min ago</faceplate-timeago></a>
        </div>
        <div slot="comment">Hello!</div>
        <div slot="comment">Hi</div>
        <div slot="text-body">World!</div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(2); // "Hello!" and "World!" should be included (both have 6 chars)
      expect(result.items[0].type).toBe('comment');
      expect(result.items[0].textContent).toBe('Hello!');
      expect(result.items[0].URL).toBe('http://localhost:3000/r/test/comments/123/comment/min6/');
      expect(result.items[1].type).toBe('post');
      expect(result.items[1].textContent).toBe('World!');
      expect(result.items[1].URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
    });

    it('should handle realistic Reddit thread structure from actual Reddit', async () => {
      // Based on real Reddit thread structure observed at:
      // https://www.reddit.com/r/Anthropic/comments/1m0ye5y/kimi_k2_vs_claude_vs_openai_cursor_realworld/
      document.title = 'Kimi K2 vs. Claude vs. OpenAI | Cursor Real-World Research Task : r/Anthropic';
      
      // Simulate realistic Reddit thread HTML with actual content patterns
      document.body.innerHTML = `
        <div class="reddit-page">
          <div class="post-container">
            <div slot="text-body">
              <p>Comparison of the output from Kimi K2, Claude 4.0 and OpenAI (o3-pro; 4.1):</p>
              <p>I personally think Claude 4.0 Sonnet remains the top LLM for performing research tasks and agentic reasoning, followed by o3-pro</p>
              <p>However, Kimi K2 is quite impressive, and a step in the right direction for open-source models reaching parity with closed-source models in real-life, not benchmarks</p>
              <ul>
                <li>Sonnet followed instructions accurately with no excess verbiage, and was straight to the point—responded with well-researched points (and counterpoints)</li>
                <li>K2 was very comprehensive and generated some practical insights, similar to o3-pro, but there was a substantial amount of "fluff"</li>
                <li>o3-pro was comprehensive but sort of trailed from the prompt—seemed instructional, rather than research-oriented</li>
                <li>4.1 was too vague and the output touched on the right concepts, yet did not "peel the onion" enough</li>
              </ul>
              <p>My rankings: (1) Claude Sonnet 4.0, (2) Kimi K2, (3) o3 pro, and (4) GPT 4.1</p>
              <p>Let me know your thoughts!</p>
            </div>
          </div>
          
          <div class="comments-section">
            <div slot="commentMeta">
              <a href="/r/Anthropic/comments/1m0ye5y/comment/n3dkgky/"><faceplate-timeago>5h ago</faceplate-timeago></a>
            </div>
            <div slot="comment">
              <div class="comment-content">
                <div class="comment-meta">
                  <span class="author">Winding_Path_001</span>
                  <span class="score">2 points</span>
                  <span class="age">5h ago</span>
                </div>
                <div class="comment-body">
                  <p>I wonder if that's the right paradigm with the velocity of MCP at the moment as a roll your own counsel of experts. Gemini plays cop, Kimi K2 as gifted whiz kid creative coder, and Anthropic for the ?Flavor? of the vector store. But no lock on wisdom here for something that is rapidly now changing by the week.</p>
                </div>
              </div>
            </div>
            
            <div slot="comment">
              <div class="comment-content">
                <div class="comment-meta">
                  <span class="author">Both-Basis-3723</span>
                  <span class="score">1 point</span>
                  <span class="age">26m ago</span>
                </div>
                <div class="comment-body">
                  <p>I believe KIMI doesn't have reasoning yet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const result = await extractor.extract();
      
      expect(result.items).toHaveLength(3); // 1 post + 2 comments
      expect(result.title).toBe('Kimi K2 vs. Claude vs. OpenAI | Cursor Real-World Research Task : r/Anthropic');
      
      const postItems = result.items.filter(item => item.type === 'post');
      const commentItems = result.items.filter(item => item.type === 'comment');
      
      expect(postItems).toHaveLength(1);
      expect(commentItems).toHaveLength(2);
      
      // Validate post content extraction
      expect(postItems[0].textContent).toContain('Comparison of the output from Kimi K2, Claude 4.0 and OpenAI');
      expect(postItems[0].textContent).toContain('Claude 4.0 Sonnet remains the top LLM');
      expect(postItems[0].textContent).toContain('My rankings: (1) Claude Sonnet 4.0');
      expect(postItems[0].URL).toBe('https://www.reddit.com/r/programming/comments/abc123/test_post/');
      
      // Validate comment content extraction
      expect(commentItems[0].textContent).toContain('Winding_Path_001');
      expect(commentItems[0].textContent).toContain('velocity of MCP at the moment');
      expect(commentItems[0].textContent).toContain('counsel of experts');
      expect(commentItems[0].URL).toBe('http://localhost:3000/r/Anthropic/comments/1m0ye5y/comment/n3dkgky/');
      
      expect(commentItems[1].textContent).toContain('Both-Basis-3723');
      expect(commentItems[1].textContent).toContain('I believe KIMI doesn\'t have reasoning yet');
      expect(commentItems[1].URL).toBe('http://localhost:3000/r/Anthropic/comments/1m0ye5y/comment/n3dkgky/');
      
      // Validate that all items have proper structure
      result.items.forEach(item => {
        expect(item.id).toBeTruthy();
        expect(item.element).toBeTruthy();
        expect(item.textContent).toBeTruthy();
        expect(item.textContent.length).toBeGreaterThan(5);
        expect(item.selected).toBe(false);
        expect(['post', 'comment']).toContain(item.type);
      });
    });
  });
});