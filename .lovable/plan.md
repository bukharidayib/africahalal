

# Payment Before Submission — Restructured Application Flow

## Current Flow
Fill form (5 steps) → Submit → Invoice created → Payment prompt (optional)

## New Flow
Fill form (5 steps) → Step 6: **Payment** → Pay via MoMo → Application auto-submitted after payment

## How It Works

1. **Add Step 6 "Payment"** to the stepper (after Declaration)
2. When user clicks "Continue" on Step 5 (Declaration), the app **auto-saves as draft** and creates an invoice linked to that draft application
3. Step 6 shows the fee summary and MoMo payment form (provider selector + phone number) inline — no separate dialog needed
4. After successful payment, the application status is automatically changed from `draft` to `submitted` and the user is redirected to `/client/applications`
5. Remove the post-submission payment prompt dialog (no longer needed)

## Files Changed

### `src/pages/client/CertificationApplication.tsx`
- Add step 6 `{ id: 6, name: "Payment", icon: CreditCard }` to the steps array
- When advancing from step 5 to step 6: auto-save draft (reuse existing `handleSaveDraft` logic), then create the invoice and store its ID in state
- Step 6 UI: show fee summary + inline MoMo payment form (provider select, phone input, pay button) — essentially embed the payment form directly instead of using the dialog
- On payment success: update application status to `submitted`, send notification email, redirect
- Remove the `showPaymentPrompt` dialog and `showMoMoPayment` dialog since payment is now inline
- The "Final Submit & Lock" button on step 5 becomes "Continue to Payment"

### `src/components/billing/MoMoPaymentDialog.tsx`
- No changes needed — we can either reuse it as a dialog triggered from step 6, or embed its logic inline. Simplest: keep it and open it from step 6's "Pay Now" button.

### `supabase/functions/process-momo-payment/index.ts`
- Update to also accept `draft` status invoices (currently only allows `pending`/`overdue`) — since the invoice is created before submission, it's already `pending`, so no change needed here.

## Key Details
- The invoice is created when entering step 6, linked to the draft application
- If payment succeeds, the draft is promoted to `submitted`
- If the user closes without paying, the draft and pending invoice remain — they can return later via "My Applications" and pay from there
- Declaration validations (signature, checkboxes) are enforced before allowing progression to step 6

