
# Implementation Plan

This plan addresses four issues: email notifications on status changes, billing visibility in admin, invoice RLS fix, and adding a Certification Validity Period field to admin billing.

---

## 1. Fix: Admin Cannot See Client-Created Invoices (RLS Issue)

**Root Cause**: The invoices table only has an INSERT policy for admins (`is_admin_user`). When a client submits an application and the code tries to insert an invoice, it silently fails because the client has no INSERT permission.

**Fix (Database Migration)**:
- Add a new RLS policy allowing authenticated clients to insert invoices for their own organization:

```sql
CREATE POLICY "Clients can insert own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
```

This ensures invoices created during application submission actually persist in the database and are visible to both admin and client.

---

## 2. Application Status Email Notifications (Already Working)

The `ApplicationDetail.tsx` (lines 277-293) already sends status notification emails via `send-status-notification` edge function for every status change. The edge function handles all 7 statuses with appropriate messaging. The "approved" status already fetches and includes certificate details in the email (lines 82-107 of the edge function).

**No changes needed** -- this is already implemented and working.

---

## 3. Add Certification Validity Period to Admin Billing Edit Dialog

**File: `src/admin/pages/AdminBilling.tsx`**

Add a "Certification Validity Period" dropdown to the Edit Invoice dialog. When the admin changes the validity period, the amount auto-updates:

- Add a new field to `editForm` state: `validity_period` (default empty)
- Fetch the linked application's `validity_period` when opening the edit dialog
- Add a Select dropdown with options: "6 Months (ZMW 1,500)" and "1 Year (ZMW 3,000)"
- When validity period changes, auto-update the amount field
- On save, if the invoice has a linked `application_id`, also update the `certification_applications` table's `validity_period` and `application_fee` columns

Changes to the Edit dialog (around line 458-510):
- Add validity period Select between the Amount and Due Date fields
- Add logic: when validity changes, set amount to 1500 or 3000 accordingly
- Also add validity period to the Create Invoice dialog for consistency

---

## 4. Also Add Validity Period to the Create Invoice Dialog

In the Create Invoice dialog (lines 255-302), add an optional "Certification Validity Period" select. When selected, auto-populate the amount. This is helpful when the admin manually creates invoices for certification fees.

---

## Summary of Changes

| Change | Type | File(s) |
|--------|------|---------|
| Add client INSERT policy on invoices | Database Migration | SQL migration |
| Add validity period to Edit Invoice dialog | Frontend | `AdminBilling.tsx` |
| Add validity period to Create Invoice dialog | Frontend | `AdminBilling.tsx` |
| Auto-update amount when validity changes | Frontend | `AdminBilling.tsx` |

No new edge functions are needed. No changes to the status notification system (already working).
