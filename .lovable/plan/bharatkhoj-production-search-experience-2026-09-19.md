# BharatKhoj production search experience

## Build
- Create the branded home, search, about, privacy, contact, and settings pages using the supplied BharatKhoj logo and restrained orange/green design.
- Add shared navigation, footer, advertisement placeholders, accessible search controls, keyboard-friendly suggestions, voice input support, and mobile layouts.
- Create `/api/search` and `/api/suggestions` endpoints with strict input validation, URL safety checks, normalized result data, short-lived safe caching, and replaceable provider interfaces.
- Return an honest configured/unconfigured state; never generate demo results or expose credentials.
- Add complete route metadata, canonical links, BharatKhoj structured data, and a favicon derived from the supplied logo.

## Technical details
- Keep search providers isolated behind a `SEARCH_PROVIDER` adapter selected only on the server.
- Render all provider text as plain React text and open validated result URLs with safe external-link attributes.
- Debounce and cancel suggestion requests, cap suggestions at six, and support Arrow Up/Down, Enter, and Escape.
- Add polished no-query, no-results, unavailable, network, invalid-query, rate-limit, and server-error states.
- Skip the requested rate limiter for now because the available lightweight option has unreliable distributed enforcement; the endpoint remains ready for a shared limiter later.

## Verification
- Check compilation diagnostics and test desktop/mobile pages, query navigation, suggestions, and the unconfigured provider state in the live preview.
