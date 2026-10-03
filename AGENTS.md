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
- Search result links open an in-app website viewer with an explicit original-site fallback because independent sites can block iframe embedding.
