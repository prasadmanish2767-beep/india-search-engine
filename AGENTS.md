<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The answer endpoint returns grounded answer text, cited facts, and an optional existing result-image index in one response, because image and facts must come from the same real results without extra search requests.
- Search result links open the original website externally because the user canceled the in-app viewer.
- Answer emphasis is computed from literal grounded answer text in a browser-safe helper; it never changes or invents facts.
- Web searches use supplied relevant images first, then one cached real image search per submitted query; image display does not depend on an AI answer succeeding.
- Brand surfaces use one locally served public logo and a favicon derived from it, avoiding platform-specific asset proxies on external hosting.
- Leaf routes share brand-image metadata from a browser-safe module; absolute sharing URLs target the user-specified public hosting origin.
