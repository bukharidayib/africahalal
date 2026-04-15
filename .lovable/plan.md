

## Plan: Add SEO to All Public Pages

### Approach
Create a reusable `<SEO>` component using `react-helmet-async` to inject per-page `<title>`, `<meta>` descriptions, Open Graph tags, canonical URLs, and JSON-LD structured data. Add `sitemap.xml` and `robots.txt` for crawler discovery.

**Note:** Pre-rendering (`vite-plugin-prerender`) requires Puppeteer which is heavy in CI — we skip it for now. `react-helmet-async` alone ensures correct metadata for social sharing and crawlers that execute JS (Google does).

### Files

| File | Action |
|------|--------|
| `src/components/SEO.tsx` | **Create** — reusable Helmet component with title, description, OG, canonical, JSON-LD |
| `src/main.tsx` | Wrap `<App>` in `<HelmetProvider>` |
| `public/sitemap.xml` | **Create** — all public routes |
| `public/robots.txt` | **Create** — allow all, point to sitemap |
| ~15 page files | Add `<SEO>` with unique metadata |

### Per-Page Metadata

| Route | Title | Keywords |
|-------|-------|----------|
| `/` | Halal Certification Zambia \| African Halal Institute | halal certification zambia, halal food zambia |
| `/about` | About Us \| African Halal Institute | halal certification authority, zambia |
| `/services` | Halal Certification Services \| AHI | halal auditing, training, consulting |
| `/standards` | Halal Standards & Methodology \| AHI | halal standards, ISO compliance |
| `/certification-journey` | Certification Process \| AHI | how to get halal certified |
| `/industries` | Industries We Certify \| AHI | food, hospitality, cosmetics |
| `/directory` | Halal Certified Directory \| AHI | halal businesses zambia |
| `/verify` | Verify Certificate \| AHI | verify halal certificate |
| `/contact` | Contact Us \| AHI | halal certification contact |
| `/blog` | Blog \| AHI | halal news, insights |
| `/blog/:slug` | Dynamic from post title | article schema |
| `/halal-certification-zambia` | Halal Certification Zambia \| AHI | geo SEO |
| `/halal-certification-lusaka` | Halal Certification Lusaka \| AHI | city SEO |
| `/verify-halal-certificate` | Verify Halal Certificate Online \| AHI | verification |

### Structured Data
- **Home**: Enhanced `Organization` schema
- **Blog posts**: `Article` schema with dynamic title/date
- **Directory**: `ItemList` schema

### Dependencies
- `react-helmet-async`

