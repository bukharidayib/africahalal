

# Fix Admin Portal 404 — Two Issues

## Problem 1: Vercel 404 on Admin Routes
Vercel doesn't know this is a single-page app (SPA). When you visit `/admin/login` directly, Vercel looks for a file at that path and returns 404. You need a `vercel.json` config to redirect all routes to `index.html`.

**Fix:** Create `vercel.json` in the project root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Problem 2: Admin Pages in Lovable Preview
The admin routes exist in `App.tsx` (lines 173-199) and should work in the preview. To access them, navigate to `/admin/login` in the preview URL bar. The admin portal uses its own authentication system — you need to sign in with an admin account (a user who has a role in the `user_roles` table).

If you're seeing a blank page or redirect loop in the preview, it's because:
- No Supabase session exists (you're logged into the client portal, not admin)
- Or the logged-in user has no admin role assigned in `user_roles`

## Changes

| File | Change |
|------|--------|
| `vercel.json` (new) | Add SPA rewrite rule for Vercel deployment |

## After Implementation
1. Redeploy on Vercel — all routes will resolve correctly
2. In the Lovable preview, navigate to `/admin/login` and sign in with admin credentials

