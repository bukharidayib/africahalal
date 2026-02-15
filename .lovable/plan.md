

# Implementation Plan

This plan covers 6 changes: data cleanup guidance, removing Google Sign-In, improving the Forgot Password email, draft/submit application flow, AI-powered ingredient detection in admin, and showing company names on documents.

---

## 1. Clean All Data (Manual Step)

This requires running SQL queries directly against your database. You will need to execute these in the Supabase SQL Editor (Cloud View > Run SQL):

```sql
-- Delete in dependency order
DELETE FROM product_ingredients;
DELETE FROM application_products;
DELETE FROM application_documents;
DELETE FROM application_status_history;
DELETE FROM certificates;
DELETE FROM invoices;
DELETE FROM payment_transactions;
DELETE FROM inspection_reports;
DELETE FROM inspections;
DELETE FROM certification_applications;
DELETE FROM client_businesses;
DELETE FROM support_chat_messages;
DELETE FROM support_tickets;
DELETE FROM audit_logs;
DELETE FROM admin_invitations;
DELETE FROM organizations;
-- Delete all auth users (must be done via Supabase Dashboard > Authentication > Users)
```

Auth users cannot be deleted via SQL -- you will need to go to your Supabase Dashboard > Authentication > Users and delete them manually.

---

## 2. Remove "Sign in with Google" from Auth Pages

**Files:** `src/pages/auth/SignIn.tsx`, `src/pages/auth/SignUp.tsx`

- Remove the "Or continue with" separator and the Google sign-in button from SignIn.tsx (lines 136-150)
- Remove the "Or register with" separator and the Google sign-up button from SignUp.tsx (lines 257-267)
- Remove the `Chrome` import from both files

---

## 3. Beautiful Forgot Password Email via Resend

**File:** Create new edge function `supabase/functions/send-password-reset/index.ts`

Currently, forgot password uses Supabase's default email. We will:

- Create a new edge function that sends a branded password reset email using Resend (already configured with `RESEND_API_KEY`)
- The email will include the company logo (hosted URL), "African Halal Integrity System" branding, and a styled reset button
- Update `ForgotPassword.tsx` to call this edge function instead of `supabase.auth.resetPasswordForEmail`

The edge function will:
1. Receive the user's email
2. Call `supabase.auth.admin.generateLink({ type: 'recovery', email })` using the service role key to get the reset link
3. Send a beautifully branded HTML email via Resend with the logo and company name
4. The reset link will redirect to `/auth/reset-password` as before

**File:** Update `src/pages/auth/ForgotPassword.tsx` to call the new edge function

**File:** Update `supabase/config.toml` to register the new function

---

## 4. Draft and Submit Application Flow

**File:** `src/pages/client/CertificationApplication.tsx`

Currently, applications are always submitted with `status: 'submitted'`. Changes:

- Add a "Save as Draft" button alongside the "Submit" button on the final step (Declaration)
- "Save as Draft" skips declaration validation and saves with `status: 'draft'` and no `submitted_at`
- "Submit" keeps the current behavior (validates declarations, sets `status: 'submitted'`, creates invoice, sends email)
- Draft applications do NOT create invoices or send notification emails

**File:** `src/pages/client/ClientApplicationDetail.tsx`

- If the application status is `draft`, show a "Continue / Submit" button that navigates back to the application form
- If the status is anything other than `draft`, the application is read-only (current behavior)

**File:** `src/pages/client/CertificationApplication.tsx`

- Add support for loading an existing draft application when navigating with an application ID (e.g., `/client/apply?draft=<id>`)
- Pre-fill all form fields from the saved draft data
- On submit, update the existing record instead of inserting a new one

---

## 5. AI-Powered Haram Ingredient Detector in Admin Application Detail

**File:** Create new edge function `supabase/functions/analyze-ingredients/index.ts`

This edge function will:
- Receive a list of product ingredients from the application
- Call Lovable AI (google/gemini-3-flash-preview) with a specialized prompt to analyze each ingredient
- Classify ingredients as: Halal, Haram, Unknown/Suspicious
- Return structured results using tool calling

**File:** `src/admin/pages/ApplicationDetail.tsx`

- Add a new tab called "AI Analysis" in the application detail tabs
- Add an "Analyze Ingredients" button that sends all products and their ingredients to the edge function
- Display results in a clear table showing:
  - Ingredient name
  - AI Classification (Halal / Haram / Unknown) with color-coded badges
  - Reasoning from the AI
  - Admin can then mark each as "Accepted" or "Flagged" manually
- Store the analysis results so the admin does not need to re-run it

**File:** Update `supabase/config.toml` to register the new function

---

## 6. Show Company Name on Documents in Both Portals

**File:** `src/pages/client/DocumentVault.tsx`

- Update the Supabase query to join through `certification_applications` to `organizations` to get the company name
- Display the organization name on each document card (e.g., below the document type)

**File:** Update admin document views in `src/admin/pages/ApplicationDetail.tsx`

- The Documents tab already shows documents per application. Add the organization name as a header or label so each document is clearly associated with the company.

---

## Summary of Changes

| Change | Type | Files |
|--------|------|-------|
| Data cleanup | Manual SQL | Supabase SQL Editor |
| Remove Google Sign-In | Frontend | SignIn.tsx, SignUp.tsx |
| Branded password reset email | Edge Function + Frontend | New send-password-reset function, ForgotPassword.tsx, config.toml |
| Draft/Submit application flow | Frontend | CertificationApplication.tsx, ClientApplicationDetail.tsx |
| AI Haram Ingredient Detector | Edge Function + Frontend | New analyze-ingredients function, ApplicationDetail.tsx, config.toml |
| Company name on documents | Frontend | DocumentVault.tsx, ApplicationDetail.tsx |

