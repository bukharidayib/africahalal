

## Fix: Database Schema Mismatch, Broken DB Functions, RLS Recursion, and Build Errors

### Root Cause Analysis

After deep investigation, I found the core problem: **the database schema was migrated** from using an enum-based `role` column to a UUID-based `role_id` foreign key in the `user_roles` table, but **three critical layers were NOT updated**:

1. **Database functions** (`has_role`, `get_user_role`, `get_user_permissions`) still reference the old `user_roles.role` column that no longer exists
2. **Supabase TypeScript types** (`types.ts`) still describe the old schema
3. **Frontend auth code** (`useAdminAuth.ts`) queries `select('role')` which doesn't exist

Additionally, there are **6 RLS policies on `user_roles`** - some of which self-reference `user_roles` inside their own policy, causing **infinite recursion**.

This cascade means:
- Admin login fails because `fetchUserRole` queries a non-existent column
- Even if the query worked, RLS infinite recursion blocks it
- The user is told "You do not have admin access" even though they DO have a `super_admin` role assigned

### What's Actually in the Database

```text
user_roles table (ACTUAL):
+------+----------+----------+-------------+----------+
| id   | user_id  | role_id  | assigned_by | assigned_at |
+------+----------+----------+-------------+----------+
| uuid | uuid     | uuid FK  | uuid        | timestamp   |
                      |
                      v
              admin_roles table:
              +------+-------------+-------------------+
              | id   | name        | display_name       |
              +------+-------------+-------------------+
              | uuid | super_admin | Super Administrator |
              | uuid | cert_officer| Certification Off.  |
              +------+-------------+-------------------+
```

But `types.ts` says `user_roles` has a `role` enum column (not `role_id` UUID).

### Missing Tables in types.ts

The database has these tables that are **missing from types.ts**:
- `blogs` (exists in DB with: id, title, slug, excerpt, content, image_url, author_id, published, published_at, created_at, updated_at)
- `organization_supervisors` (exists in DB with: id, organization_id, supervisor_id, assigned_at, assigned_by)

### All Issues Found

| Issue | File(s) | Impact |
|-------|---------|--------|
| DB functions use non-existent `role` column | `has_role()`, `get_user_role()`, `get_user_permissions()` | Admin login completely broken |
| RLS infinite recursion on `user_roles` | 2 RLS policies self-reference the table | All user_roles queries fail |
| types.ts out of sync | `src/integrations/supabase/types.ts` | All TypeScript build errors |
| Auth hook queries wrong column | `useAdminAuth.ts` | "No admin access" error |
| `UserManagement.tsx` column mismatch | Insert uses `role_id` but types expect `role` enum | Build error |
| `Blogs.tsx` table not in types | `blogs` table missing from types | Build error |
| `Supervisors.tsx` table not in types | `organization_supervisors` missing | Build error |
| `BlogDetail.tsx` table not in types | Same `blogs` issue | Build error |
| `Index.tsx` table not in types | Same `blogs` issue | Build error |
| `CertificationApplication.tsx` void expression | `updateFormData()` returns void, used with `\|\|` | Build error |
| `ComplianceCenter.tsx` deep type instantiation | Type recursion from missing table types | Build error |
| `Supervisors.tsx` queries `first_name`/`last_name` | Profiles table only has `full_name` | Runtime error |

---

### Implementation Plan

#### Step 1: Fix Database Functions (SQL Migration)

Replace the 3 broken functions that reference `user_roles.role` with versions that use `user_roles.role_id` joined to `admin_roles.name`:

**`get_user_role`**: Change from `SELECT role::TEXT` to join `admin_roles` via `role_id`

**`has_role`**: Change from `WHERE role = _role` to join and check `admin_roles.name`

**`get_user_permissions`**: Change from `JOIN admin_roles ar ON ar.name = ur.role::TEXT` to `JOIN admin_roles ar ON ar.id = ur.role_id`

#### Step 2: Fix RLS Policies on `user_roles`

Drop the 2 recursion-causing policies and replace with policies that use the `is_admin_user()` SECURITY DEFINER function (which doesn't cause recursion):

- **"Admins can view all user roles"** (causes recursion) -- DROP and replace
- **"Super Admins can manage user roles"** (causes recursion) -- DROP and replace
- Keep the policies that use `has_role()` since that function will be fixed

#### Step 3: Update Supabase Types

Update `types.ts` to:
- Change `user_roles` to use `role_id: string` instead of `role: enum`
- Add `blogs` table definition
- Add `organization_supervisors` table definition
- Add `support_agent` to the `admin_role` enum

#### Step 4: Fix `useAdminAuth.ts`

Update `fetchUserRole` to query via `role_id` + join to `admin_roles`:

```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('role_id, admin_roles!inner(name)')
  .eq('user_id', userId)
  .limit(1)
  .single();

// Extract role name from the join
return data?.admin_roles?.name as AdminRole;
```

#### Step 5: Fix `UserManagement.tsx`

Update the `UserRoleDetail` interface and queries to use `role_id` instead of the old `role` enum. Fix the insert statement to match the actual schema.

#### Step 6: Fix `Supervisors.tsx`

- Fix profile query to use `full_name` instead of `first_name`/`last_name`
- Cast Supabase calls to work with the updated types

#### Step 7: Fix `CertificationApplication.tsx`

Replace `updateFormData(...) || updateFormData(...)` with proper sequential calls:

```typescript
onClick={() => {
  updateFormData('validity_period', '6_months');
  updateFormData('application_fee', 1500);
}}
```

#### Step 8: Add `support_agent` to permissions.ts

Update the `AdminRole` type and `rolePermissions` to include `support_agent`.

---

### Files Changed Summary

| Category | File | Change |
|----------|------|--------|
| SQL Migration | New migration file | Fix 3 DB functions + fix RLS policies |
| Types | `src/integrations/supabase/types.ts` | Add `blogs`, `organization_supervisors`, fix `user_roles` |
| Auth | `src/admin/hooks/useAdminAuth.ts` | Fix `fetchUserRole` to use `role_id` join |
| Auth | `src/admin/lib/permissions.ts` | Add `support_agent` role |
| Admin | `src/admin/pages/UserManagement.tsx` | Fix interface + queries for `role_id` |
| Admin | `src/admin/pages/Supervisors.tsx` | Fix profile field names |
| Admin | `src/admin/pages/Blogs.tsx` | Cast types for `blogs` table |
| Public | `src/pages/BlogDetail.tsx` | Cast types for `blogs` table |
| Public | `src/pages/Index.tsx` | Cast types for `blogs` table |
| Client | `src/pages/client/CertificationApplication.tsx` | Fix void expression |
| Client | `src/pages/client/ComplianceCenter.tsx` | Fix type instantiation |

---

### Testing Checklist

1. Navigate to `/admin/login` -- should show login form, no "You do not have admin access" error
2. Login with `admin@ahis.org` -- should redirect to `/admin/dashboard`
3. Navigate to `/admin/certificates`, `/admin/applications` -- should load without infinite spinner
4. Logout -- should redirect immediately to `/admin/login`
5. Visit homepage `/` -- blog section should load without errors
6. Visit `/admin/blogs` -- should load and allow CRUD
7. Visit `/admin/supervisors` -- should load supervisor list

