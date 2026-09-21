# BharatKhoj search UX upgrade

## Build
- Keep the existing BharatKhoj layout and styling unchanged while enhancing the current search box.
- Replace typing-time provider requests with debounced local suggestion generation that produces 5–8 context-aware phrases and highlights matching text.
- Add up to five recent searches from local storage, with individual removal controls; never send history externally.
- Preserve keyboard navigation and make suggestion selection submit one real search only.
- Add brief search/loading transitions, staggered result entrances, related-search hover feedback, and reduced-motion fallbacks.
- Fill related searches locally only after genuine results return, while preserving any real provider-supplied related phrases.
- Preserve the existing free-quota cache, manual retry, unavailable state, and real-results-only behavior.

## Technical details
- Keep all assistance phrase generation in the browser with deterministic query-aware templates; no suggestion API or search-provider request occurs while typing.
- Store normalized recent-search strings under one BharatKhoj-specific local-storage key, capped at five.
- Render highlighted matches as React text nodes, keep listbox accessibility, prevent mobile overflow, and use semantic design tokens.

## Verification
- Check keyboard, click, history removal, one-request-per-submit, exhausted-quota retry, and result/related-search behavior.
- Verify desktop and mobile layouts, reduced-motion behavior, clean diagnostics, and absence of provider branding or credentials in browser responses.
