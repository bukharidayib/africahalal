## Update Application Categories, Pricing & Fix "Apply for Certification" CTA

Align the client portal's certification application with the official AHI Application Fee Structure (effective 09-04-2026) and connect the broken "Apply for Certification" button on the homepage.

### 1. New Business Categories & Pricing

Replace the existing 5 categories on **Step 2** of `src/pages/client/CertificationApplication.tsx` with the official 6 categories, each tied to a fixed application fee in ZMW:

| Business Category | Application Fee |
|---|---|
| Restaurants | K10,000 |
| Cafés | K10,000 |
| Butcheries | K10,000 |
| Abattoirs | K20,000 |
| Franchises | K20,000 |
| Manufacturing Companies | K30,000 |

### 2. Fee Calculation Logic

- Replace the current "Validity Period" fee selector (which sets `application_fee = 1`) with a **business category single-select** that drives the fee automatically.
- Keep the validity period (6 months / 1 year) as a separate informational choice (no price change — fee is per category, not per validity).
- When a category is selected, `formData.application_fee` is set to the matching tier (10,000 / 20,000 / 30,000 ZMW).
- The fee summary card on Step 5 (Review) and the invoice created on Step 6 (Payment) will then reflect the correct ZMW amount, currency already `'ZMW'`.
- Add a non-refundable notice + line "Covers initial application review and administrative processing only. Inspection, audit, and annual fees billed separately." per the official document.

### 3. Fix "Apply for Certification" Button on Homepage

In `src/pages/Index.tsx` (line ~221), the hero CTA button has no `onClick` or `asChild`/`Link` wrapper — it's a dead button. Wrap it with React Router `Link` so:
- If user is signed in → navigate to `/client/applications/new`
- If not signed in → navigate to `/auth/signup?redirect=/client/applications/new`

Use the existing `useUser` (Clerk) hook on the page to decide the destination.

Other "Apply for Certification" CTAs on `HalalCertificationZambia.tsx` and `CityLanding.tsx` already link to `/auth/signup` — leave them as-is since they target unauthenticated visitors.

### 4. Display Fee Table Publicly

On the **homepage** (`src/pages/Index.tsx`) and the **Services** page, add a small "Application Fees" section showing the 6-row pricing table (institutional card style) so visitors see fees before applying — fulfills the document's instruction to "ensure clear visibility under the Apply for Certification section."

### Files Touched

- `src/pages/client/CertificationApplication.tsx` — replace categories array, replace validity-period fee selector with category-driven fee, update Step 5 review summary
- `src/pages/Index.tsx` — wire up "Apply for Certification" hero button + add fee table section
- `src/pages/Services.tsx` — add the same fee table section

### Out of Scope

- No database schema changes (fee already stored as `amount` in `certification_invoices`, currency already ZMW).
- No changes to ZynlePay/MoMo payment flow.
- No edits to Standards / Industries pages.