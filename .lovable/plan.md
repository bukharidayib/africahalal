# Plan: Route Refresh Audit, Friendly 404, and Admin Route Guard

Three independent improvements bundled together.

---

## 1. Hostinger Route Refresh Audit (automated check)

**Goal:** From the live Hostinger domain, hit every portal route directly (simulating a hard refresh) and report which ones return a non-HTML response (i.e. SPA fallback failed).

**Approach:** A standalone Node script (`scripts/audit-hostinger-routes.mjs`) that:

1. Hard-codes the list of all routes from `src/App.tsx` (public, `/auth/*`, `/client/*`, `/admin/*`, `/inspector/*`, `/supervisor/*`).
2. Accepts the deployed origin as an arg, e.g. `node scripts/audit-hostinger-routes.mjs https://yourdomain.com`.
3. For each route, performs a `GET` with `Accept: text/html` and checks:
   - HTTP status is `200`
   - `Content-Type` includes `text/html`
   - Body contains `<div id="root"`(confirms it's the SPA shell, not a real Apache 404 page)
4. Prints a table to the terminal: `OK` / `FAIL (reason)` per route, then a summary count.
5. Exits with code `1` if any route fails (so it can be wired into CI later).

**You run it locally** after deploying to Hostinger:
```
node scripts/audit-hostinger-routes.mjs https://your-hostinger-domain.com
```
This tells you exactly which routes the `.htaccess` is or isn't catching.

No browser automation needed — pure `fetch()` from Node 18+.

---

## 2. Friendly Not-Found Page with Portal Suggestions

Replace the bare `src/pages/NotFound.tsx` with a helpful page that:

- Shows the attempted path so the user can see what they typed.
- Detects the path prefix (`/admin`, `/client`, `/inspector`, `/supervisor`) and suggests the matching portal sign-in or dashboard with a "Did you mean…?" callout.
- Always shows a card grid of all four portals + the public homepage with a short description and a button:
  - Home (`/`)
  - Client Portal (`/auth/signin`)
  - Admin Portal (`/admin/login`)
  - Inspector Portal (`/inspector/signin`)
  - Supervisor Portal (`/supervisor/signin`)
- Uses existing design system tokens (Card, Button, Lucide icons) — no new dependencies.
- Keeps the existing `console.error` so 404s remain logged.

The route registration stays the same (`<Route path="*" element={<NotFound />} />` — already present at end of `App.tsx`).

---

## 3. Centralized Admin Route Protection

**Current state:** Every admin page individually wraps itself in `<AdminLayout>`, which calls `useAdminAuthContext()` and redirects to `/admin/login` when not authenticated. This works but is fragile — any new admin page that forgets `<AdminLayout>` becomes publicly accessible.

**Fix:** Add a dedicated `AdminProtectedRoute` component and apply it once at the route level so protection isn't dependent on page authors remembering the layout.

**Changes:**

1. **New file `src/admin/components/AdminProtectedRoute.tsx`** — reads `useAdminAuthContext()`, shows the same loader during `isLoading`, and `<Navigate to="/admin/login" replace />` when not authenticated. Mirrors the existing `ProtectedRoute` pattern used for client routes.

2. **Update `src/App.tsx`** — restructure the `/admin` route block:
   ```text
   /admin (AdminProviderWrapper)
     ├── login          (public)
     ├── register       (public)
     └── *              (AdminProtectedRoute → all other admin pages)
   ```
   Implementation: split into two child route groups under the same `AdminProviderWrapper` — one for `login`/`register`, and a nested wrapper element `<AdminProtectedRoute><Outlet/></AdminProtectedRoute>` containing every other admin route.

3. **No page changes required.** `AdminLayout` keeps its own auth check as defense-in-depth, but the route guard becomes the source of truth.

---

## Files to Add / Modify

**Add:**
- `scripts/audit-hostinger-routes.mjs`
- `src/admin/components/AdminProtectedRoute.tsx`

**Modify:**
- `src/pages/NotFound.tsx` — friendly portal suggestions
- `src/App.tsx` — wrap admin routes in `AdminProtectedRoute`

**Unchanged:**
- `public/.htaccess` (already deployed)
- All admin page files
- All other portal protected-route components

---

## Out of Scope

- Testing routes in a real browser (the audit script handles this from the command line).
- Changing inspector/supervisor protection (they already have dedicated guards at the route level).
- Server-side rendering or pre-rendering.
