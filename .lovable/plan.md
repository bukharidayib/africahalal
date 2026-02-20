
# Three-Part Improvement Plan

## Overview of What You Asked For

1. **Workflow Stage tab** — simplify so a role can only be mapped to "which application status it can SET", not a grid of 8 permissions per stage.
2. **Admin Application Review** — add ability to open/download attached documents, and send a custom message to the application owner (with Resend email).
3. **AI Haram Alert** — after AI detects Haram/Unknown ingredients, allow the admin to notify the application owner with an email explaining the issue.

---

## Part 1 — Workflow Stage Simplification

### The Problem
Currently the Workflow tab shows every permission the role has (e.g., 8 applications permissions) inside each of the 7 stages. This is confusing because most of those permissions are not about "when" — the real question is simply: **at which stage can this role change the application status, and to which target status?**

### The New Model
Replace the complex permission checkbox grid inside each stage with a single, clean question:

> **"Which application statuses can this role set when an application is in Stage X?"**

Each stage gets a set of **target-status toggles** — a row of status chips (e.g., `Under Review`, `Inspection Scheduled`, `Approved`, `Rejected`) that the admin can toggle on or off. That's it.

**Visual Design (per stage accordion row):**
```text
Stage 2 — Under Review                           [2 targets] [▼]
  ┌─────────────────────────────────────────────────────────────┐
  │ This role can move applications TO:                         │
  │  [✓ Inspection Scheduled]  [✗ Approved]  [✓ Rejected]       │
  └─────────────────────────────────────────────────────────────┘
```

### How This Maps to the Database
The underlying data model does not change. The existing `workflow_stage_permissions` table stays. The toggle for "can set status X while in Stage Y" maps to enabling the `applications.update` permission at Stage Y **plus** the specific approve/reject permissions where applicable.

Concretely:
- Every toggled target status ensures `applications.update` is enabled at the source stage
- Toggling `Approved` also ensures `applications.approve` is enabled at that stage
- Toggling `Rejected` also ensures `applications.reject` is enabled

The save logic derives the correct `permission_id + stage_id` pairs from the user's simple toggle selections, keeping full backward compatibility with the existing `can_perform_workflow_action` DB function.

### Files Changed
- `src/admin/pages/RoleEditor.tsx` — replace the current workflow tab body with the new status-toggle accordion

---

## Part 2 — Admin Application Review Improvements

### 2A — Open/View Documents
Currently the Documents tab shows a list of file names but no way to open them. The `file_path` column already contains the Supabase Storage path (e.g., `5dbeaceb.../business_registration/1771...file.pdf`). Documents are in the private `application-documents` bucket.

**Fix:** Add a **"View / Open"** button to each document row that calls `supabase.storage.from('application-documents').createSignedUrl(file_path, 60)` and opens the resulting URL in a new browser tab. This generates a 60-second signed URL that is secure and does not expose the file permanently.

### 2B — Send Message to Application Owner (with Resend email)
Add a new **"Send Message"** tab (or section within the Overview tab) in `ApplicationDetail.tsx` that lets the admin:

1. Choose a **message type** from a dropdown:
   - Missing Documents
   - Additional Information Required
   - Ingredient Clarification Needed
   - General Update
   - Custom Message
2. Write a **message body** in a textarea
3. Click **"Send to Applicant"**

This will invoke a **new edge function** `send-application-message` that:
- Sends a branded Resend email from `info@africanhalaal.com` to the application owner's contact email (with fallback to profile email, same pattern already used)
- CC's `admin@africanhalaal.com` and `operations@africanhalaal.com`
- Saves the message to the `application_status_history` table (using the existing `reason` field) or a new lightweight `application_messages` table

**New database table needed:**
```sql
CREATE TABLE public.application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  sent_by uuid NOT NULL,
  message_type text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_messages ENABLE ROW LEVEL SECURITY;
-- Admins can insert and view
CREATE POLICY "Admins can manage messages" ON public.application_messages
  FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
-- Clients can view messages for their application
CREATE POLICY "Clients can view own messages" ON public.application_messages
  FOR SELECT USING (
    application_id IN (
      SELECT ca.id FROM certification_applications ca
      JOIN profiles p ON p.organization_id = ca.organization_id
      WHERE p.id = auth.uid()
    )
  );
```

**Email template** will include:
- Application number and organization name
- Message type as subject prefix (e.g., "Action Required: Missing Documents")
- Admin's message body
- Link to the client portal to view their application
- Contact details for follow-up

---

## Part 3 — AI Haram Alert → Notify Application Owner

### The Problem
After running AI ingredient analysis and detecting Haram or Unknown/Suspicious ingredients, the admin currently has no way to formally notify the application owner. They have to manually write an email outside the system.

### The Solution
After AI analysis runs and results show `haram_count > 0` or `unknown_count > 0`, display a prominent **"Notify Applicant of Ingredient Issues"** button in the AI Analysis tab. Clicking it:

1. Opens a confirmation dialog showing:
   - Summary of flagged ingredients (product name + ingredient name + classification)
   - Pre-filled message text (editable) explaining the issue
2. Admin clicks **"Send Notification"**
3. System calls the **same** `send-application-message` edge function with type `ingredient_issue`

The email to the applicant will include:
- A clearly formatted table of flagged ingredients (product, ingredient, classification, reasoning)
- Instructions to review/replace the problematic ingredients and resubmit their Technical Specification Sheets
- A direct link to their application in the client portal

### Files Changed
- `src/admin/pages/ApplicationDetail.tsx` — add "Send Message" tab, document signed URL button, and "Notify Applicant" AI alert button
- `supabase/functions/send-application-message/index.ts` — new edge function (handles both general messages and ingredient alerts)
- Database migration — add `application_messages` table with RLS

---

## Technical Details

### Edge Function: `send-application-message`
```text
POST body:
{
  application_id: string,
  application_number: string,
  organization_name: string,
  contact_email: string,
  message_type: 'missing_documents' | 'additional_info' | 'ingredient_issue' | 'general' | 'custom',
  message: string,
  flagged_ingredients?: Array<{ product_name, ingredient_name, classification, reasoning }>
}
```
Uses `RESEND_API_KEY` (already configured). Sends from `info@africanhalaal.com`.

### Document Signed URLs
No backend change needed. The frontend calls `supabase.storage.from('application-documents').createSignedUrl(doc.file_path, 60)` — this works with the existing private bucket. The signed URL expires in 60 seconds (enough time to open/download the file).

### Summary of File Changes

| File | What Changes |
|------|-------------|
| `src/admin/pages/RoleEditor.tsx` | Workflow tab: replace permission-checkbox-per-stage with simple status-toggle-per-stage design |
| `src/admin/pages/ApplicationDetail.tsx` | Add "Open" button on documents, add "Send Message" tab, add "Notify Applicant" button in AI Analysis tab |
| `supabase/functions/send-application-message/index.ts` | New edge function for general admin-to-applicant messaging |
| Database migration | New `application_messages` table with RLS policies |
