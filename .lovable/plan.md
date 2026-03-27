

# Fix SEO Logo — Use AHI Logo Instead of Lovable Default

## Problem
The Google search result snippet shows an incorrect logo. Two issues:

1. **`og:image` uses a relative path** (`/logo.png`) — search engines and social crawlers require **absolute URLs** to resolve images.
2. **Missing `og:url`** meta tag — Google needs this to properly associate metadata with the canonical URL.
3. **`logo.png` in `public/`** may be the correct AHI logo already (used across the app), but crawlers can't fetch it via a relative path.

## Changes

### `index.html`
- Change `og:image` from `/logo.png` to `https://africanhalaal.com/logo.png` (the published custom domain)
- Change `twitter:image` from `/logo.png` to the same absolute URL
- Add `<meta property="og:url" content="https://africanhalaal.com" />`
- Add `<meta property="og:site_name" content="African Halal Institute" />`
- Remove the `<!-- TODO -->` comment on line 6

This is a single-file change. After deployment, you'll need to wait for Google to re-crawl, or use [Google Search Console](https://search.google.com/search-console) to request re-indexing for the changes to appear in search results.

