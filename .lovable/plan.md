# Quotations: Recipients + Edit + Delete

Enhance the Accountant → Quotations module in the Admin portal with three improvements:

## 1. Multi-email recipients on New Quotation

- Add a "Send to (emails)" field to the New Quotation dialog using the existing `EmailTagsInput` component (`src/admin/components/EmailTagsInput.tsx`) — already supports multi-email tag entry with validation.
- Pre-fill the field with the selected organization's `contact_email` (when known) so the accountant can simply add additional recipients.
- Store the array in the existing `quotations.recipient_emails` column (already in schema — no migration needed).
- Update `send-quotation-email` Edge Function to:
  - Read `recipient_emails` from the quotation; if non-empty, send to that array.
  - Fall back to current `resolveRecipient` (org contact / profile) only when the array is empty.
  - Pass `to: recipient_emails` to Resend (Resend supports up to 50 recipients per send).
  - Log each recipient in the audit entry.

## 2. Edit Quotation dialog

- Add a pencil "Edit" button per row in the Quotations table, enabled only for `draft` and `sent` statuses (locked once `accepted`, `rejected`, `expired`, or `converted`).
- Reuse the same form layout as New Quotation (organization, title, line items, tax, valid until, notes, recipient emails).
- On save, `UPDATE` the quotation row (recompute subtotal/tax/total). Quote number stays unchanged.
- Show a confirmation toast and refresh the list.

## 3. Delete Quotation dialog

- Add a trash "Delete" button per row, enabled only for `draft` and `rejected` statuses (block deletion of sent/accepted/converted quotes for audit integrity — show disabled state with tooltip).
- Use shadcn `AlertDialog` for confirmation showing the quotation number and total.
- On confirm, `DELETE` from `quotations`, refresh the list, success toast.

## Technical details

- All work is in `src/admin/components/accountant/QuotationsTab.tsx` and `supabase/functions/send-quotation-email/index.ts`.
- No DB migration required — `recipient_emails text[]` already exists on `quotations`.
- RLS already allows accountants to update/delete quotations they manage; will verify by reading existing policies on `quotations` before implementing. If the delete policy is missing, add one via migration restricted to draft/rejected status and accountant role.
- Form state shape extended with `recipient_emails: string[]`.
- Edit reuses the same dialog component by toggling `mode: 'create' | 'edit'` and seeding `form` from the row.
- Edge function backward compatible — existing single-recipient flow still works when `recipient_emails` is empty.

## Files

- `src/admin/components/accountant/QuotationsTab.tsx` — add EmailTagsInput field, edit dialog, delete AlertDialog, action buttons.
- `supabase/functions/send-quotation-email/index.ts` — accept multi-recipient array.
- (Conditional) one small migration if delete RLS is missing.
