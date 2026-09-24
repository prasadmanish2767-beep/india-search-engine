# BharatKhoj: India's Search

Build a production-quality web search engine called “BharatKhoj”.

BRAND:
- Product name: BharatKhoj
- Tagline: “India First Search Engine”
- Use ONLY BharatKhoj branding throughout the website.
- Do not display Google, Bing, or any third-party search-engine branding anywhere in the visible UI.
- Use the provided BharatKhoj logo everywhere the brand logo is required.
- Favicon, title, metadata and loading states should use BharatKhoj branding.
- Never use a third-party company's logo as the BharatKhoj logo.

DESIGN REFERENCE:
Use the attached screenshots as the visual reference.
Recreate the overall clean, minimal search-engine experience:
- White/off-white background
- BharatKhoj orange + green brand colors
- Thin orange/green Indian-inspired top and bottom accent lines
- Centered logo and wordmark
- Large clean search box
- Minimal navigation
- Responsive desktop and mobile layouts
- Professional spacing and typography
- No unnecessary cards, gradients, excessive animations, or generic AI-dashboard styling

HOME PAGE:
1. Top horizontal advertisement placeholder:
   “📢 Ad Space — Your advertisement here”
2. Center BharatKhoj logo.
3. Large BharatKhoj wordmark.
4. Subtitle:
   “India First Search Engine”
5. Large search bar with:
   - Search icon
   - Placeholder: “Search BharatKhoj”
   - Clear button when text exists
   - Voice-search button
6. Search suggestions should appear while typing.
7. Press Enter or click Search to navigate to:
   /search?q=<query>
8. Footer:
   © 2026 BharatKhoj. All rights reserved.
   About | Privacy Policy | Contact

SEARCH EXPERIENCE:
When a user searches, show a real search-results page rather than fake/demo results.

Example:
Search query:
“elon musk”

Results page should contain:
- Compact BharatKhoj header
- BharatKhoj logo on the left
- Search box across the top
- Search button
- Voice-search button
- Search result count/time when available
- Organic web results
- Result title
- URL/domain
- Short snippet
- Optional favicon
- Pagination / “Load more”
- Related searches
- Image/news/video sections when supported by the backend
- Mobile responsive result layout

SEARCH RESULTS BACKEND:
Create a proper server-side search abstraction.

Architecture:

Frontend
↓
BharatKhoj Search API
↓
Search Provider / Search Index
↓
Normalized BharatKhoj result format
↓
Frontend result renderer

Do NOT expose private API keys in frontend JavaScript.

Create:
POST /api/search
or
GET /api/search?q=<query>

Normalize every provider response into:

{
  title: string,
  url: string,
  displayUrl: string,
  snippet: string,
  favicon?: string,
  publishedDate?: string,
  source?: string
}

IMPORTANT:
Do not hard-code fake results.
If the search provider is not configured, show a clearly designed:
“Search service is not configured yet”
state instead of pretending that fake results are real.

Create a SEARCH_PROVIDER abstraction so the backend can later support:
- an external licensed web-search provider
- BharatKhoj's own crawler/index
- other legally permitted search sources

Do not use an outdated API.
Keep the provider implementation replaceable.

SEARCH SUGGESTIONS:
Implement:
GET /api/suggestions?q=<query>

Suggestions should be generated from the configured suggestion/search service.
Show a maximum of 6 suggestions.
Keyboard support:
- Arrow Up
- Arrow Down
- Enter
- Escape

SEARCH RESULT SAFETY:
- Sanitize all result titles/snippets before rendering.
- Never execute HTML returned by external sources.
- Validate URLs.
- Use safe external-link handling.
- Add loading, error and empty-result states.

RESULT PAGE UI:
Make it visually similar to a modern search engine but NOT a copy of another company's branding.

Desktop:
- Header height around 72px
- BharatKhoj logo left
- Search field center
- Account/settings area right
- Results column max-width around 800px
- Optional right-side information panel

Mobile:
- Compact BharatKhoj header
- Search field full width
- Results optimized for small screens
- Touch-friendly controls
- No horizontal scrolling

BRAND COLORS:
Primary Orange: #FF6B00
Primary Green: #168A45
Text: #263238
Secondary Text: #607D8B
Background: #FFFFFF
Border: #E5E5E5

Do not overuse the colors.
Keep the design premium and restrained.

PAGES:
/
  BharatKhoj homepage

/search
  Real search results

/about
  About BharatKhoj

/privacy
  Privacy Policy

/contact
  Contact BharatKhoj

/settings
  Search preferences

ERROR STATES:
Create polished states for:
- No query
- No results
- Search service unavailable
- Network error
- Rate limit
- Invalid query
- Server error

SEO:
Add:
- BharatKhoj title
- BharatKhoj meta description
- Open Graph metadata
- Twitter/X metadata
- BharatKhoj favicon
- Organization structured data
- Proper canonical URLs
- Semantic HTML
- Accessible labels

PERFORMANCE:
- Fast initial page load
- Lazy-load non-critical elements
- Debounce search suggestions
- Cache safe repeated searches on the server
- Never expose API credentials
- Prevent duplicate requests
- Add reasonable rate limiting to the search API

ADS:
Keep the advertisement areas as placeholders initially.
Do not put fake advertisements into the results.
Create reusable:
<AdSlot position="top" />
<AdSlot position="results" />
components for future monetization.

IMPORTANT BRAND RULE:
The entire visible product should feel like BharatKhoj.
Every logo, loading animation, empty state, error state, favicon, search header and footer should use BharatKhoj branding.

Do NOT:
- Put Google branding in the search box.
- Put “Enhanced by Google”.
- Put Google logos.
- Put Bing logos.
- Use third-party branding as the main product identity.
- Create fake search results.
- Hard-code search results.
- expose API keys in client-side code.
- create a fake “AI search” that pretends to be a real web index.

FINAL PRODUCT:
The result should feel like a serious Indian search-engine startup:
“BharatKhoj — India First Search Engine”

The homepage should closely follow the simplicity and structure of the supplied screenshots, while the search-results experience should be a polished original BharatKhoj interface.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://india-search-engine.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e8f0eaa4-5d56-44da-b8b5-d494375f8722).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
