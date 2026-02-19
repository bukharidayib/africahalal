
# Fix the 404 on "Create Your Admin Account" Link

## Root Cause (Confirmed)

The invitation email was successfully sent (confirmed via edge function logs at 15:27 UTC). The email link correctly points to `/admin/register` — but it uses a **hardcoded URL** of `https://africahalal.lovable.app`, which is the **published/live** version of the app.

The problem: `/admin/register` only exists in the **test/preview** environment right now. The live published version still has the old code without this route, so clicking the link from the email produces a 404.

There are two things to fix:

**Fix 1 — Dynamic URL in the Edge Function**
The `appUrl` in `supabase/functions/send-invitation/index.ts` is hardcoded to `https://africahalal.lovable.app`. This means every invitation email always links to the live site — even if sent from the preview environment. This needs to be changed to read the `Origin` header from the request, so:
- If the admin portal is open at the preview URL (`id-preview--...lovable.app`), the invitation links to the preview URL
- If the admin portal is open at the live URL (`africahalal.lovable.app`), it links to the live URL

**Fix 2 — Publish the App**
The `/admin/register` page and its route were added to the codebase but the live published app was never updated. Once Fix 1 is applied and the edge function re-deployed, you will need to click **"Publish"** in Lovable to push the new code to `africahalal.lovable.app`.

---

## What Will Be Changed

### File: `supabase/functions/send-invitation/index.ts`

Change the hardcoded `appUrl` (line 69) from:
```typescript
const appUrl = "https://africahalal.lovable.app";
```
to a dynamic version that reads the `Origin` or `Referer` header from the incoming request:
```typescript
const origin = req.headers.get("origin") || req.headers.get("referer") || "";
const appUrl = origin.startsWith("http") 
  ? new URL(origin).origin 
  : "https://africahalal.lovable.app";
```

This way the invitation link automatically uses the correct base URL — whether the admin is sending the invite from the preview build or the live site.

The edge function will be redeployed automatically after the file change.

---

## After the Fix

1. The edge function is updated and redeployed (automatic)
2. You click **Publish** in Lovable to push the `/admin/register` route to the live site
3. Send a new test invitation from the Admin Portal
4. The email link will now correctly point to the live site and the `/admin/register` page will exist there

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-invitation/index.ts` | Replace hardcoded `appUrl` with dynamic origin detection from request headers |

No database changes needed. No new files needed.
