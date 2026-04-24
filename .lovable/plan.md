## Fix Hostinger SPA routing (404 on non-admin portals)

Add `public/.htaccess` so Apache on Hostinger falls back to `index.html` for client-side routes. Vite copies files in `public/` into the build output, so after rebuild the file lands in `dist/.htaccess` and gets uploaded with the rest of the site.

### Change

Create `public/.htaccess` with:

- `mod_rewrite` SPA fallback: serve real files/dirs as-is, otherwise serve `/index.html` so React Router takes over.
- Correct MIME types for `.js`, `.css`, `.svg`, `.json` (some Hostinger setups miss these).
- Long cache for hashed assets, no cache for `index.html` so updates show immediately.

### After approval — what you do

1. Rebuild locally: `npm run build`.
2. Upload the **contents of `dist/`** into `public_html/` on Hostinger (not the `dist` folder itself — `index.html` must sit directly in `public_html/`).
3. In Hostinger File Manager enable **Settings → Show hidden files** so `.htaccess` is visible and uploaded.
4. Hard refresh (`Ctrl+Shift+R`) to bypass the cached 404.

### Notes

- Keep `BrowserRouter` and `base: '/'` in `vite.config.ts` (current setup).
- If you ever host under a subfolder like `yoursite.com/app/`, both the `RewriteBase` and Vite `base` need to change to `/app/`.
