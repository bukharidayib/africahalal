

# Migrate All Portal Authentication from Supabase Auth to Clerk

## Overview

Replace Supabase Auth with Clerk across all 4 portals (Client, Admin, Inspector, Supervisor). Clerk handles sign-in/sign-up UI and session management. Supabase remains the database -- Clerk JWTs are passed to the Supabase client so RLS policies (`auth.uid()`) continue to work seamlessly.

## Architecture

```text
┌──────────────┐      ┌──────────┐      ┌──────────────┐
│  React App   │──────│  Clerk   │──────│  Clerk JWT   │
│ <SignIn/>    │ auth │ Session  │ jwt  │  Template    │
│ <SignUp/>    │      │          │      │ (Supabase)   │
└──────┬───────┘      └──────────┘      └──────┬───────┘
       │                                        │
       │  supabase client with Clerk JWT        │
       └────────────────────────────────────────┘
                        │
                  ┌─────▼─────┐
                  │ Supabase  │  auth.uid() = Clerk user ID
                  │ Database  │  RLS works unchanged
                  └───────────┘
```

## Prerequisites (User Actions Required)

1. **Clerk Dashboard**: Create a JWT Template named `supabase` with:
   - Signing algorithm: HS256
   - Signing key: Your Supabase JWT secret (found in Supabase Settings > API > JWT Secret)
   - Claims: `{ "sub": "{{user.id}}", "role": "authenticated", "iss": "supabase", "aud": "authenticated" }`

2. **Provide keys**: Clerk publishable key (stored as `VITE_CLERK_PUBLISHABLE_KEY` in code) and secret key (stored as Supabase edge function secret `CLERK_SECRET_KEY`)

## Implementation Steps

### Step 1: Install Clerk + Configure Provider
- Install `@clerk/clerk-react`
- Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env`
- Wrap `App.tsx` in `<ClerkProvider>`
- Create `src/integrations/clerk/supabaseClient.ts` -- a hook that gets a Clerk token via `useAuth().getToken({ template: 'supabase' })` and creates a Supabase client with that token in the Authorization header

### Step 2: Replace All Auth Pages with Clerk Components
- **Client**: Replace `SignIn.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` with Clerk `<SignIn>` / `<SignUp>` components (routed via `routing="path"`)
- **Inspector**: Replace `InspectorSignIn.tsx`, `InspectorForgotPassword.tsx`, `InspectorResetPassword.tsx`
- **Supervisor**: Replace `SupervisorSignIn.tsx`, `SupervisorRegister.tsx`, `SupervisorForgotPassword.tsx`, `SupervisorResetPassword.tsx`
- **Admin**: Replace `AdminLogin.tsx`, `AdminRegister.tsx`

Each portal gets its own sign-in page that wraps Clerk's `<SignIn>` with portal-specific branding and redirect URLs.

### Step 3: Replace Protected Routes
- **`ProtectedRoute.tsx`**: Replace `supabase.auth.getSession()` with Clerk's `useAuth()` -- check `isSignedIn`
- **`InspectorProtectedRoute.tsx`**: Use `useAuth()` for session, then query `inspectors` table with Clerk-authenticated Supabase client
- **`SupervisorProtectedRoute.tsx`**: Same pattern, query `organization_supervisors`
- **`AdminLayout.tsx`**: Same pattern, query `user_roles`

### Step 4: Rewrite `useAdminAuth` Hook
- Replace all `supabase.auth.*` calls with Clerk's `useUser()`, `useAuth()`, `useClerk()`
- `signIn` becomes `clerk.signIn.create()` (or just redirect to Clerk sign-in page)
- `signOut` becomes `clerk.signOut()`
- Keep role/permission fetching from Supabase (unchanged)

### Step 5: Replace `supabase.auth.*` Across All 52 Files
Every file that calls `supabase.auth.getSession()` or `supabase.auth.getUser()` changes to:
- Use Clerk's `useAuth()` to get `userId`
- Use the Clerk-authenticated Supabase client for database queries
- Pattern: create a `useSupabaseClient()` hook that returns a Supabase client with the Clerk JWT injected

### Step 6: Update Edge Functions
- Add `CLERK_SECRET_KEY` as a Supabase secret
- Edge functions that validate JWTs switch from Supabase auth to verifying Clerk JWTs (or rely on the Supabase client's built-in JWT verification since we're using a compatible JWT template)

### Step 7: Update Profile Trigger
- The `handle_new_user` trigger on `auth.users` won't fire for Clerk users
- Create a Clerk webhook (via edge function) that listens for `user.created` and inserts into `profiles` table
- Or: create profile on first sign-in from the client side

### Step 8: Database Cleanup
- No schema changes needed -- RLS policies using `auth.uid()` will receive the Clerk user ID via the JWT template
- Existing data linked to old Supabase Auth user IDs will be orphaned (acceptable per "fresh start" decision)

## Files Modified

| Area | Files | Change |
|------|-------|--------|
| Config | `package.json`, `.env` | Add `@clerk/clerk-react`, `VITE_CLERK_PUBLISHABLE_KEY` |
| Provider | `App.tsx`, `main.tsx` | Wrap in `<ClerkProvider>` |
| New utility | `src/integrations/clerk/supabaseClient.ts` | Clerk-authenticated Supabase client hook |
| Client auth (4 files) | `SignIn`, `SignUp`, `ForgotPassword`, `ResetPassword` | Replace with Clerk components |
| Inspector auth (3 files) | `InspectorSignIn`, `ForgotPassword`, `ResetPassword` | Replace with Clerk components |
| Supervisor auth (4 files) | `SupervisorSignIn`, `Register`, `ForgotPassword`, `ResetPassword` | Replace with Clerk components |
| Admin auth (2 files) | `AdminLogin`, `AdminRegister` | Replace with Clerk components |
| Protected routes (3 files) | `ProtectedRoute`, `InspectorProtectedRoute`, `SupervisorProtectedRoute` | Use Clerk `useAuth()` |
| Admin auth hook | `useAdminAuth.ts` | Rewrite for Clerk |
| Admin context | `AdminAuthContext.tsx` | Update types |
| Admin layout | `AdminLayout.tsx` | Use Clerk auth |
| All data pages (~40 files) | Every file with `supabase.auth` | Use Clerk-authenticated Supabase client |
| Edge functions | All that validate auth | Use Clerk JWT verification |
| New edge function | `clerk-webhook/index.ts` | Handle `user.created` for profile creation |

## What the User Needs to Do

1. Set up Clerk project and provide publishable key + secret key
2. Configure Supabase JWT Template in Clerk dashboard
3. Re-create users in Clerk (or import them)
4. Link Inspector/Supervisor records to new Clerk user IDs

