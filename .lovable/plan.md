
# Root Cause Found: Emails Not Sending Due to Null Contact Email + Missing Fallback

## The Diagnosis (100% Confirmed)

After checking the database, the edge function, and the frontend code, I have found **two problems** that together prevent any email from being sent.

---

### Problem 1 — The `organizations.contact_email` is NULL in the database (CRITICAL)

Querying the database shows:

| Organization | contact_email | Profile Email |
|---|---|---|
| Bukhari Restaurents | **NULL** | bukharipanel@gmail.com |

The organizations table has `contact_email = NULL` for all clients because this field is **not populated during the signup/application process**. The client's actual email lives in the `profiles` table (linked via `organization_id`), not in `organizations`.

### Problem 2 — The frontend silently skips the email when `contact_email` is NULL

In `ApplicationDetail.tsx` line 356–370:

```typescript
const contactEmail = application.organizations?.contact_email;
if (contactEmail) {  // ← NULL = falsy → this block is NEVER entered
  await supabase.functions.invoke('send-status-notification', { ... });
}
// No email sent. No error logged. No toast. Complete silence.
```

When `contact_email` is NULL, the email invocation is **skipped silently** — no error, no warning, nothing in the console. This is why the feature appears broken with no logs anywhere.

### The Edge Function Works Perfectly

Testing the edge function directly returned `{"success": true, "emailId": "a460fd10-..."}` — proving the function itself is working and Resend is configured correctly. The only issue is the frontend never calls it because of the NULL email guard.

---

## The Fix: 3-Part Solution

---

### Fix 1 — Fetch Profile Email as Fallback in `ApplicationDetail.tsx`

The `fetchApplicationDetails` function needs to also query the `profiles` table to get the client's email (the one they signed up with), and use it as a fallback when `organizations.contact_email` is NULL.

**Current query** fetches only `organizations` data — no profile email.

**New query** adds a subquery to get the profile email of the user linked to this organization:

```typescript
// Add to fetchApplicationDetails:
const { data: profileData } = await supabase
  .from('profiles')
  .select('id, email, full_name')
  .eq('organization_id', appData.organization_id)
  .limit(1)
  .single();

// Store it in state
setClientProfile(profileData);
```

**New email resolution logic in `handleStatusUpdate`:**

```typescript
// Priority 1: organization contact_email (if populated)
// Priority 2: profile email (the user's login email)
const contactEmail = 
  application.organizations?.contact_email || 
  clientProfile?.email;

if (contactEmail) {
  await supabase.functions.invoke('send-status-notification', { ... });
} else {
  // Now we can actually warn the admin
  toast({ variant: 'destructive', title: 'No email found', description: 'Cannot send notification — no contact email on file for this organization.' });
}
```

---

### Fix 2 — Add an Error Toast When No Email is Found

Currently if no email is found, the code silently does nothing. After the fix, if both `contact_email` and `profile.email` are NULL (unlikely but possible), the admin will see a clear warning toast.

---

### Fix 3 — Update the Edge Function to Also Accept the Profile Email and Use It in the "To" Field

The edge function already accepts `contact_email` in its payload. No changes needed to the function itself — the fix is entirely in the frontend.

However, we should also update the edge function to handle the case where `contact_email` is the profile email (not the org contact email) — which means the `to` field will correctly be the client's real email. This is already handled since the function just uses whatever `contact_email` is passed in.

---

## Files to Change

| File | Change |
|------|--------|
| `src/admin/pages/ApplicationDetail.tsx` | Add `clientProfile` state + fetch profile email in `fetchApplicationDetails()` + use profile email as fallback in `handleStatusUpdate()` + add warning toast when no email found |

---

## What This Looks Like After the Fix

**When admin updates status:**
1. System checks `organizations.contact_email` → NULL
2. System falls back to `profiles.email` → `bukharipanel@gmail.com` ✅
3. Edge function is called with the correct email
4. Client receives the branded status update email
5. For `approved` → client receives congratulations email + PDF certificate

**Edge case protection:**
- If both are NULL → admin sees a clear toast: "No contact email on file for this organization"
- The email is never silently lost again
