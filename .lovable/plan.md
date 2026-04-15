

## Plan: Fix Payment Status, Document Viewing, and Admin Screenshot Access

### Problem Summary
1. **Online payment success doesn't set application to "Submitted"** — invoice becomes `paid` but `certification_applications.status` stays unchanged.
2. **Document viewing is broken** — Eye and Download buttons in Document Vault have no click handlers.
3. **Admin can't view offline payment screenshots** — storage SELECT policy only allows file owners to view documents; no admin policy exists.

### Changes

#### 1. Update Application Status on Payment Completion

**Edge functions** (`process-momo-payment`, `zynlepay-momo-callback`, `check-payment-status`):
After marking invoice as `paid`, also update the linked application status to `submitted`:
```sql
UPDATE certification_applications SET status = 'submitted', submitted_at = now()
WHERE id = invoice.application_id AND status = 'draft';
```

**Admin offline approval** (`AdminBilling.tsx`):
After approving offline payment and marking invoice paid, also update the application status to `submitted` using the invoice's `application_id`.

#### 2. Fix Document Viewing in Client Portal

**`DocumentVault.tsx`**:
- Add `handleView(doc)` — calls `supabase.storage.from('application-documents').createSignedUrl(doc.file_path, 300)` and opens in new tab.
- Add `handleDownload(doc)` — calls `createSignedUrl` with `download: true` option and triggers download.
- Wire the Eye and Download buttons to these handlers.

#### 3. Add Admin Storage SELECT Policy (Migration)

Add a storage policy allowing admins to view files in the `application-documents` bucket:
```sql
CREATE POLICY "Admins can view all application documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND is_admin_user(auth.uid())
);
```

### Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/process-momo-payment/index.ts` | After invoice paid, update app status to submitted |
| `supabase/functions/zynlepay-momo-callback/index.ts` | Same — update app status on completed payment |
| `supabase/functions/check-payment-status/index.ts` | Same — update app status on completed payment |
| `src/admin/pages/AdminBilling.tsx` | After offline approval, update app status to submitted |
| `src/pages/client/DocumentVault.tsx` | Add view/download handlers with signed URLs |
| Migration SQL | Add admin SELECT policy on `storage.objects` for `application-documents` |

