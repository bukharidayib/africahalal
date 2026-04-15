

## Plan: Aggressive SEO Optimization to Rank #1 for Halal Certification in Zambia

### Current Gaps
1. **`index.html` has duplicate/conflicting meta tags** — static OG tags clash with Helmet-injected ones, confusing crawlers.
2. **No `FAQPage` structured data** — Index and Zambia pages have FAQs but no JSON-LD schema, missing rich snippet opportunities.
3. **No `LocalBusiness` / `ProfessionalService` schema** — Google needs this for local search dominance.
4. **`BASE_URL` points to `africahalal.lovable.app`** — should use `africanhalaal.com` if that's the production domain.
5. **No `hreflang` or geo meta tags** — missing `geo.region=ZM` signals.
6. **Missing `<lastmod>` dates in sitemap** — Google deprioritizes sitemaps without them.
7. **SEO component missing `og:locale`** — should declare `en_ZM`.
8. **No breadcrumb structured data** — missed rich snippet type.
9. **Homepage H1 is generic** — needs stronger keyword density for "halal certification zambia".

### Changes

#### 1. Clean Up `index.html`
Remove all duplicate OG/Twitter/description meta tags. Keep only the base `<title>` and JSON-LD Organization. Helmet handles the rest per-page.

#### 2. Enhance `SEO.tsx`
- Add `og:locale` = `en_ZM`
- Add `geo.region` = `ZM`, `geo.placename` = `Lusaka` meta tags
- Update `BASE_URL` to `https://africanhalaal.com` (production domain from JSON-LD in index.html)
- Use the existing social image from index.html as `DEFAULT_OG_IMAGE`

#### 3. Add `FAQPage` Structured Data
- **Index.tsx**: Add `FAQPage` JSON-LD for the 5 FAQs
- **HalalCertificationZambia.tsx**: Add `FAQPage` JSON-LD for the 6 FAQs (this page is the primary SEO landing page)

#### 4. Add `ProfessionalService` Schema to Key Pages
Rich local business schema on Index and HalalCertificationZambia pages:
```json
{
  "@type": "ProfessionalService",
  "name": "African Halal Institute",
  "areaServed": { "@type": "Country", "name": "Zambia" },
  "serviceType": "Halal Certification",
  "priceRange": "ZMW 2,500+"
}
```

#### 5. Strengthen Page Titles and Descriptions
More keyword-dense, long-tail targeting:

| Page | New Title | New Description |
|------|-----------|-----------------|
| `/` | Halal Certification Zambia — African Halal Institute \| AHI | Africa's trusted Halal certification body in Zambia. ISO-accredited, Shariah-compliant certification for food, meat, hospitality & exports. Apply online today. |
| `/halal-certification-zambia` | Halal Certification in Zambia 2026 — Cost, Process & Requirements \| AHI | Complete guide to Halal certification in Zambia. Learn costs from ZMW 2,500, the 6-step process, requirements & how to apply with AHI. |
| `/services` | Halal Certification Services Zambia — Auditing, Training & Consulting \| AHI | Professional Halal certification, auditing, inspection & training services in Zambia. Internationally recognized by OIC member countries. |
| `/about` | About African Halal Institute — Zambia's Halal Certification Authority | Learn about AHI, Zambia's leading ISO-accredited Halal certification authority with 10+ years of excellence and 50+ expert auditors. |
| `/certification-journey` | How to Get Halal Certified in Zambia — Step-by-Step Process \| AHI | 7-step Halal certification process in Zambia. From application to certificate in 5-7 days. Start your certification journey with AHI. |

#### 6. Update Sitemap with `<lastmod>` Dates
Add `<lastmod>2026-04-15</lastmod>` to all URLs.

#### 7. Add More Geo-Targeted Landing Pages to Sitemap
Add `/halal-certification-lusaka` city page and any other city routes.

### Files to Edit

| File | Change |
|------|--------|
| `index.html` | Remove duplicate meta tags, keep minimal fallback |
| `src/components/SEO.tsx` | Add geo meta, og:locale, update BASE_URL and default OG image |
| `src/pages/Index.tsx` | Enhanced title/desc/keywords, add FAQPage + ProfessionalService schema |
| `src/pages/HalalCertificationZambia.tsx` | Enhanced title/desc, add FAQPage schema |
| `src/pages/Services.tsx` | Enhanced title/desc/keywords |
| `src/pages/About.tsx` | Enhanced title/desc/keywords |
| `src/pages/CertificationJourney.tsx` | Enhanced title/desc |
| `src/pages/Industries.tsx` | Enhanced title/desc |
| `src/pages/Contact.tsx` | Enhanced title/desc |
| `src/pages/HalalCertificationLusaka.tsx` | Enhanced title/desc |
| `src/pages/Standards.tsx` | Enhanced title/desc |
| `src/pages/Verify.tsx` | Enhanced title/desc |
| `src/pages/Directory.tsx` | Enhanced title/desc |
| `public/sitemap.xml` | Add lastmod dates to all URLs |

