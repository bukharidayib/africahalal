

# Remove All SEO Components and Dependencies

## What Will Be Removed

### Files to Delete
- `src/components/seo/SEOHead.tsx`
- `src/components/seo/StructuredData.tsx`
- `public/robots.txt`
- `public/sitemap.xml`

### Files to Edit — Remove SEO imports and usage
These pages import `SEOHead` and/or `StructuredData`. The imports and JSX usage will be stripped:

1. `src/pages/Index.tsx` — remove SEOHead, StructuredData, organizationSchema, localBusinessSchema, createFAQSchema
2. `src/pages/About.tsx` — remove SEOHead, StructuredData, organizationSchema
3. `src/pages/Directory.tsx` — remove SEOHead, StructuredData, createBreadcrumbSchema
4. `src/pages/DirectoryCategory.tsx` — remove SEOHead, StructuredData, createBreadcrumbSchema
5. `src/pages/HalalCertificationZambia.tsx` — remove SEOHead, StructuredData, createFAQSchema, createBreadcrumbSchema
6. `src/pages/HalalCertificationLusaka.tsx` — remove SEOHead, StructuredData
7. `src/pages/CityLanding.tsx` — remove SEOHead, StructuredData, createBreadcrumbSchema
8. `src/pages/Verify.tsx` — remove SEOHead, StructuredData (if present)
9. `src/pages/VerifyHalalCertificate.tsx` — remove SEOHead, StructuredData (if present)
10. `src/pages/BlogIndex.tsx` — remove SEOHead, StructuredData (if present)
11. `src/pages/Services.tsx` — remove SEOHead (if present)
12. `src/pages/Contact.tsx` — remove SEOHead (if present)

### `src/main.tsx` — Remove HelmetProvider wrapper
Render `<App />` directly without `<HelmetProvider>`.

### `index.html` — Strip SEO meta tags
Remove all Open Graph, Twitter Card, geo tags, sitemap link, and extra keywords meta. Keep only the basic `<title>`, charset, viewport, and favicon.

### `package.json` — Remove `react-helmet-async` dependency

## What Stays
- All page content, routes, and functionality remain intact
- The basic `<title>` tag in `index.html` stays

