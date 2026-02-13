

# Implementation Plan

This plan covers four changes: fix the dashboard greeting, add a welcome email on signup, send status emails when applications are submitted, and include certificate details in the approval email.

---

## 1. Dashboard Greeting -- Show User's Name Instead of Business Name

**File: `src/pages/client/ClientDashboard.tsx`**

Line 190 currently shows: `Marhaban, {organizationName || userName || 'Welcome'}`

Change priority to show the user's name first:
`Marhaban, {userName || 'Welcome'}`

Remove `organizationName` from the greeting (keep fetching it if used elsewhere on the page, but the greeting should always show the authenticated user's `full_name`).

---

## 2. Welcome Email on Signup (New Edge Function)

**New file: `supabase/functions/send-welcome-email/index.ts`**

Create a Resend-powered edge function that sends a professional HTML welcome email:
- From: `Africa Halal Integrity System <info@africanhalaal.com>`
- Subject: "Welcome to Africa Halal Integrity System"
- Body: Personalized greeting with the user's full name, brief intro about the platform, link to the client dashboard, and support contact

**File: `src/pages/auth/SignUp.tsx`**

After successful signup (line ~113, after `authData.user` is confirmed), invoke the new edge function:
```
await supabase.functions.invoke('send-welcome-email', {
  body: { full_name: fullName, email }
});
```

---

## 3. Status Email on Application Submission

**File: `src/pages/client/CertificationApplication.tsx`**

After the application is successfully inserted and audited (around line 408, before the success toast), call the existing `send-status-notification` edge function:

```typescript
try {
  const { data: org } = await supabase
    .from('organizations')
    .select('name, contact_email')
    .eq('id', organization_id)
    .single();

  await supabase.functions.invoke('send-status-notification', {
    body: {
      application_id: appData.id,
      new_status: 'submitted',
      application_number: applicationNumber,
      organization_name: org?.name || formData.entity_name,
      contact_email: org?.contact_email || user.email,
    }
  });
} catch (emailErr) {
  console.error('Failed to send submission email:', emailErr);
}
```

This uses the already-existing edge function which handles "submitted" status with the right messaging. No new edge function needed for this.

The admin `ApplicationDetail.tsx` already sends status emails for all subsequent status changes (under_review, inspection_scheduled, etc.), so those are already covered.

---

## 4. Approved Status Email Already Includes Certificate

The existing `send-status-notification` edge function (lines 82-107) already handles this: when `new_status === "approved"`, it fetches the certificate from the database and includes certificate number, scope, issue/expiry dates in the email. No changes needed here -- this is already working.

---

## Technical Summary

### New Files
- `supabase/functions/send-welcome-email/index.ts` -- Welcome email via Resend

### Modified Files
- `src/pages/client/ClientDashboard.tsx` -- Line 190: show `userName` instead of `organizationName`
- `src/pages/auth/SignUp.tsx` -- Call welcome email after signup
- `src/pages/client/CertificationApplication.tsx` -- Call status notification after submission

### No Database Changes Required

