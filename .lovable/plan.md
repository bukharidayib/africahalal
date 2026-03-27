

# Complete SEO System for africanhalaal.com + Logo Update

## Two Deliverables

### A. Logo Update
Copy the uploaded logo to `public/logo.png` (replacing existing) so the header, favicon references, and branding all use the new AHI logo.

---

### B. Full SEO Implementation

This is a large, multi-phase implementation. Here is the execution plan organized by priority.

---

## Phase 1: Technical SEO Foundation (Week 1)

### 1. Enhanced Meta Tags & Structured Data (`index.html`)
- Add geo meta tags: `geo.region=ZM`, `geo.placename=Lusaka`
- Add canonical URL tag
- Add language/locale tags
- Improve meta description to include "Zambia" and "Lusaka"

### 2. JSON-LD Structured Data Component
**New file: `src/components/seo/StructuredData.tsx`**
- Reusable component that injects JSON-LD into page `<head>` via `react-helmet-async`
- Schema types: `Organization`, `LocalBusiness`, `FAQPage`, `BreadcrumbList`
- Install `react-helmet-async` dependency

### 3. SEO Head Component
**New file: `src/components/seo/SEOHead.tsx`**
- Per-page `<title>`, `<meta description>`, `<meta keywords>`, canonical URL, OG tags
- Used by every public page to set unique SEO metadata

### 4. Sitemap Generator
**New file: `public/sitemap.xml`**
- Static sitemap listing all public routes with priorities
- Include directory, verify, blog, city pages
- Add `<link rel="sitemap">` to `index.html`

### 5. Robots.txt Update
**File: `public/robots.txt`**
- Allow all crawlers, point to sitemap URL

---

## Phase 2: SEO-Optimized Landing Pages (Week 2-3)

### 6. Halal Certification Zambia Page
**New file: `src/pages/HalalCertificationZambia.tsx`**
- Route: `/halal-certification-zambia`
- H1: "Halal Certification in Zambia"
- Keyword-rich content: process, requirements, cost, benefits
- FAQ accordion with structured data
- CTAs to `/client/apply` and `/contact`
- Internal links to `/certification-journey`, `/standards`, `/directory`

### 7. Halal Certification Lusaka Page
**New file: `src/pages/HalalCertificationLusaka.tsx`**
- Route: `/halal-certification-lusaka`
- Lusaka-specific content, local business focus
- Google Maps embed area, local testimonials section

### 8. City Pages Template
**New file: `src/pages/CityLanding.tsx`**
- Route: `/halal-certification/:city` (Ndola, Kitwe, Livingstone, Chipata)
- Dynamic city name in H1, meta tags, content
- Reusable template pulling city from URL param

### 9. Verify Certificate SEO Page
**New file: `src/pages/VerifyHalalCertificate.tsx`**
- Route: `/verify-halal-certificate`
- SEO wrapper around existing verify functionality
- Targets "verify halal certificate Zambia" keywords

### 10. Directory Category Pages
**New file: `src/pages/DirectoryCategory.tsx`**
- Routes: `/directory/halal-restaurants-lusaka`, `/directory/halal-suppliers-zambia`, etc.
- Filtered view of the directory by category + city
- Each with unique SEO title/description

---

## Phase 3: Content & Blog Strategy (Week 3-6)

### 11. Blog Index Page
**New file: `src/pages/BlogIndex.tsx`**
- Route: `/blog`
- Lists all published blog posts from Supabase `blogs` table
- SEO-optimized with structured data

### 12. Blog Content Strategy (30 Topics)
These are content topics to be created in the admin CMS. Key articles:

**Money Keywords (publish first):**
1. How to Get Halal Certification in Zambia — Complete Guide 2026
2. Halal Certification Cost in Zambia — Pricing & Fees Explained
3. Halal Certification Requirements in Zambia
4. Why Your Restaurant Needs Halal Certification in Lusaka
5. Halal Certification for Food Manufacturers in Zambia

**Local SEO:**
6. Top Halal Restaurants in Lusaka — Certified Guide
7. Halal Food Guide: Where to Eat Halal in Lusaka
8. Halal Suppliers in Zambia — Verified Directory
9. Halal Meat Suppliers in Lusaka
10. Best Halal Catering Services in Zambia

**Verification/Trust:**
11. How to Verify a Halal Certificate Online
12. Understanding Halal Certificate Numbers
13. Why Halal Verification Matters for Consumers

**Industry:**
14. Halal Certification for Hotels in Zambia
15. Halal Certification for Export Companies in Zambia
16. Halal Standards for Abattoirs in Zambia
17. Halal Cosmetics Certification in Africa
18. Halal Pharmaceutical Certification Guide

**Educational:**
19. What is Halal Certification? A Complete Guide
20. Difference Between Halal and Non-Halal Food
21. Halal Certification Process Explained Step by Step
22. Benefits of Halal Certification for Businesses
23. Halal Certification and International Trade
24. Islamic Dietary Laws and Modern Food Industry
25. Halal Supply Chain Management

**Regional:**
26. Halal Certification in Southern Africa
27. Halal Market Growth in Zambia
28. Muslim Population and Halal Demand in Lusaka
29. Halal Tourism in Zambia
30. Africa's Growing Halal Economy

---

## Phase 4: Route & Navigation Updates

### 13. New Routes in `App.tsx`
```
/halal-certification-zambia → HalalCertificationZambia
/halal-certification-lusaka → HalalCertificationLusaka
/halal-certification/:city → CityLanding
/verify-halal-certificate → VerifyHalalCertificate
/directory/:category → DirectoryCategory
/blog → BlogIndex
```

### 14. Footer SEO Links
**File: `src/components/layout/Footer.tsx`**
- Add "Popular Pages" section with links to SEO landing pages
- Add city links, category links
- Keyword-rich anchor text

### 15. Internal Linking
- Add contextual links from existing pages (About, Services, Industries) to new SEO pages
- Add breadcrumbs component to all public pages

---

## Phase 5: Local SEO & Authority (Week 6-12)

### 16. Structured Data on Every Page
Add to existing pages:
- **Index.tsx**: `Organization` + `LocalBusiness` schema
- **Directory.tsx**: `ItemList` schema for listings
- **Verify.tsx**: `WebApplication` schema
- **About.tsx**: `Organization` schema with `areaServed: Zambia`
- **FAQ sections**: `FAQPage` schema

---

## Keyword Strategy Reference

| Keyword | Intent | Difficulty | Priority |
|---------|--------|-----------|----------|
| halal certification zambia | Commercial | Low | HIGH |
| halal certification lusaka | Commercial | Low | HIGH |
| halal certificate zambia | Commercial | Low | HIGH |
| halal certification cost zambia | Commercial | Low | HIGH |
| halal certification requirements zambia | Informational | Low | HIGH |
| verify halal certificate zambia | Navigational | Low | HIGH |
| halal restaurants lusaka | Local | Low | HIGH |
| halal food lusaka | Local | Low | MEDIUM |
| halal suppliers zambia | Commercial | Low | MEDIUM |
| how to get halal certification zambia | Informational | Low | HIGH |
| halal certification ndola | Local | Low | MEDIUM |
| halal certification kitwe | Local | Low | MEDIUM |
| halal meat suppliers lusaka | Local | Low | MEDIUM |
| check halal status zambia | Navigational | Low | HIGH |
| halal certification africa | Commercial | Medium | MEDIUM |

---

## Implementation Order

1. Copy logo to `public/logo.png`
2. Update `index.html` — geo tags, improved meta, sitemap link
3. Install `react-helmet-async`
4. Create `SEOHead.tsx` and `StructuredData.tsx` components
5. Create `HalalCertificationZambia.tsx` (highest priority landing page)
6. Create `HalalCertificationLusaka.tsx`
7. Create `CityLanding.tsx` template
8. Create `VerifyHalalCertificate.tsx`
9. Create `DirectoryCategory.tsx`
10. Create `BlogIndex.tsx`
11. Create `public/sitemap.xml`, update `robots.txt`
12. Update `App.tsx` with all new routes
13. Update `Footer.tsx` with SEO links
14. Add structured data to existing pages (Index, About, Directory, Verify)

## Files Changed/Created

| Action | File |
|--------|------|
| Copy | `public/logo.png` (from uploaded logo) |
| Edit | `index.html` |
| Edit | `public/robots.txt` |
| Create | `public/sitemap.xml` |
| Create | `src/components/seo/SEOHead.tsx` |
| Create | `src/components/seo/StructuredData.tsx` |
| Create | `src/pages/HalalCertificationZambia.tsx` |
| Create | `src/pages/HalalCertificationLusaka.tsx` |
| Create | `src/pages/CityLanding.tsx` |
| Create | `src/pages/VerifyHalalCertificate.tsx` |
| Create | `src/pages/DirectoryCategory.tsx` |
| Create | `src/pages/BlogIndex.tsx` |
| Edit | `src/App.tsx` (add routes) |
| Edit | `src/components/layout/Footer.tsx` (SEO links) |
| Edit | `src/pages/Index.tsx` (add structured data) |
| Edit | `src/pages/About.tsx` (add structured data) |
| Edit | `src/pages/Directory.tsx` (add structured data) |
| Edit | `src/pages/Verify.tsx` (add structured data) |
| Install | `react-helmet-async` |

