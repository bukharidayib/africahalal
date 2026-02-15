

## Problem 1: Application Status Stays "Draft" After Submit

**Root Cause:** When a client submits a draft application, the code tries to UPDATE the `certification_applications` table (changing status from 'draft' to 'submitted'). However, the RLS policies on this table do NOT allow clients to UPDATE records -- only admins/officers can. The update silently fails, so the status remains 'draft'.

**Fix:** Add an RLS policy on `certification_applications` that allows clients to update their own organization's applications, but ONLY when the current status is 'draft' (to prevent clients from changing status on submitted applications).

SQL migration:
```text
CREATE POLICY "Clients can update own draft applications"
  ON certification_applications FOR UPDATE
  USING (
    status = 'draft'
    AND organization_id IN (
      SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );
```

---

## Problem 2: Send Status Update Emails to Client AND Admin Emails

**Current State:** The `send-status-notification` edge function only sends emails to the client's contact email. You want every status change (from submission through final status) to also notify `admin@africanhalaal.com` and `operations@africanhalaal.com`.

**Fix:** Update the `send-status-notification` edge function to send to all three recipients: the client contact email + the two admin emails.

Changes to `supabase/functions/send-status-notification/index.ts`:
- Change the `to` field in `resend.emails.send()` from `[contact_email]` to `[contact_email, "admin@africanhalaal.com", "operations@africanhalaal.com"]`
- For the admin copies, adjust the greeting to reference the organization name and application number so admins have full context

---

## Summary of Changes

| File | Change |
|------|--------|
| New SQL migration | Add RLS policy allowing clients to update their own draft applications |
| `supabase/functions/send-status-notification/index.ts` | Add `admin@africanhalaal.com` and `operations@africanhalaal.com` as CC/recipients on every status notification email |

