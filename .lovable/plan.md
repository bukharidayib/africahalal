

## Plan: Fix Google Search Logo/Favicon for African Halal Institute

### Problem
Google is showing Lovable's logo instead of AHI's logo in search results. This is likely because:
1. The published Lovable URL (`africahalal.lovable.app`) may serve Lovable's default favicon
2. Missing `apple-touch-icon` and standard favicon meta tags that Google prefers
3. The Organization schema `logo` points to `/favicon.png` — Google prefers a higher-resolution logo image

### Steps

**1. Update `index.html` favicon tags**
Add proper favicon markup that Google prioritizes:
- Add `apple-touch-icon` (192x192) pointing to the AHI logo
- Add `rel="icon"` with multiple sizes
- Add a `link rel="manifest"` with site icons

**2. Update Organization schema logo**
Change the `logo` field in the JSON-LD from `favicon.png` to the full AHI logo URL (use the existing `/logo.png` or a hosted high-res version).

**3. Add `web.manifest` file**
Create a `public/site.webmanifest` with icon entries pointing to AHI's logo — Google uses this to identify the site's icon.

**4. Verify `favicon.png` is correct**
Confirm the existing `public/favicon.png` is actually AHI's logo (not Lovable's). If it's wrong, the user will need to upload the correct one.

### Files Changed
| File | Change |
|------|--------|
| `index.html` | Add apple-touch-icon, manifest link, update schema logo |
| `public/site.webmanifest` | New file with icon definitions |

### Important Note
After deployment, you'll need to **wait for Google to re-crawl** (can take a few days). You can speed this up by going to Google Search Console → URL Inspection → enter `https://africanhalaal.com` → click **Request Indexing**.

