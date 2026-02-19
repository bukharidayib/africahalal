
# Fix: Dynamic RBAC Roles Blocked by Hardcoded RLS Policies

## Root Cause (Confirmed by Full Investigation)

The system has a fundamental architectural mismatch between two layers:

**Layer 1 — The Permission System (dynamic, correct)**
- Custom roles are stored in `admin_roles` table (e.g. `cido`, `super_admin`)
- Permissions are stored in `permissions` table with codes like `applications.view`
- `role_permissions` links roles to their permissions
- `get_user_permissions()` fetches a user's permission codes dynamically
- The frontend sidebar correctly uses permission flags (`canViewApplications`)
- `afrosaas@gmail.com` has the `cido` role which has `applications.view` permission ✅

**Layer 2 — The Database RLS Policies (hardcoded, broken)**
- The `certification_applications` SELECT policy only allows:
  ```sql
  has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'certification_officer') OR assigned_officer_id = auth.uid()
  ```
- `has_role()` checks against a hardcoded `admin_role` ENUM which only has: `super_admin`, `certification_officer`, `finance_officer`, `it_system_auditor`
- `cido` is NOT in this enum — it's a custom dynamic role
- So even though the `cido` role has `applications.view` permission, the database RLS blocks all queries — returning 0 rows silently

**This same mismatch affects ALL admin-facing tables:**

| Table | Broken RLS Policy |
|-------|------------------|
| `certification_applications` | Only `super_admin` or `certification_officer` can SELECT |
| `inspections` | Only `super_admin` or `certification_officer` can manage |
| `non_conformance_notices` | Only `super_admin` or `certification_officer` can manage |
| `approval_requests` | Only `super_admin` or `certification_officer` can INSERT/UPDATE |
| `certificates` | Only `super_admin` or `certification_officer` can INSERT/UPDATE |
| `certification_decisions` | Only `super_admin` or `certification_officer` can INSERT |
| `inspectors` | Only `super_admin` can manage |
| `audit_logs` | Only `it_system_auditor` or `super_admin` can SELECT |

## The Fix: Replace Hardcoded `has_role()` Checks with Permission-Based Checks

The correct approach is to replace `has_role(auth.uid(), 'certification_officer')` with `has_permission(auth.uid(), 'applications.view')`. This way:
- The database enforces access based on **what the role is allowed to do** (permissions), not **what the role is named**
- Any custom role (like `cido`) that has been granted the relevant permission will automatically get access
- No more dependency on the hardcoded `admin_role` enum for access control

### New `is_admin_user()` check
For broad SELECT policies (e.g. "any admin can view"), keep using `is_admin_user()` — it checks the `user_roles` table directly and works with any role name.

### Updated Policy Strategy

| Action | Old Policy | New Policy |
|--------|-----------|-----------|
| SELECT applications | `has_role('super_admin') OR has_role('certification_officer')` | `is_admin_user(auth.uid())` |
| UPDATE applications | `has_role('super_admin') OR has_role('certification_officer')` | `has_permission(auth.uid(), 'applications.update')` |
| INSERT applications | `has_role('super_admin') OR has_role('certification_officer')` | `has_permission(auth.uid(), 'applications.create')` |
| SELECT inspections | `is_admin_user()` ✅ | keep as-is |
| MANAGE inspections | `has_role('super_admin') OR has_role('certification_officer')` | `has_permission(auth.uid(), 'inspections.manage')` |
| INSERT/UPDATE certificates | `has_role('certification_officer')` | `has_permission(auth.uid(), 'certificates.issue')` |
| SELECT audit_logs | `has_role('it_system_auditor') OR has_role('super_admin')` | `has_permission(auth.uid(), 'audit_logs.view')` |
| MANAGE inspectors | `has_role('super_admin')` | `has_permission(auth.uid(), 'inspectors.manage')` |

## Also Fix: Two Missing Permission Codes in `CODE_TO_KEY`

The `permissions` table has `inspectors.view` and `inspectors.manage` codes, but `src/admin/lib/permissions.ts` has no mapping for them in `CODE_TO_KEY`. This means even if the CIDO role has these inspector permissions, they never get translated to `canManageInspections` flags on the frontend.

However, looking at the Permission interface — there is no `canManageInspectors` or `canViewInspectors` field at all. The sidebar uses `canManageInspections` (plural, for the Inspections list) as the gate for the "Inspectors" nav item, which is semantically wrong.

**Fix needed:** Add `canViewInspectors` and `canManageInspectors` to the `Permission` interface and map the DB codes.

## Files to Change

### 1. Database Migration (SQL)
Drop the old hardcoded RLS policies and recreate them using `is_admin_user()` and `has_permission()`:

**`certification_applications`:**
- DROP "Officers view applications" → CREATE with `is_admin_user(auth.uid())`
- DROP "Officers can update applications" → CREATE with `has_permission(auth.uid(), 'applications.update')`
- DROP "Officers can insert applications" → CREATE with `has_permission(auth.uid(), 'applications.create')`

**`inspections`:**
- DROP "Officers can manage inspections" → CREATE with `has_permission(auth.uid(), 'inspections.manage')`

**`non_conformance_notices`:**
- DROP "Officers can manage NCNs" → CREATE with `has_permission(auth.uid(), 'enforcement.manage')`

**`approval_requests`:**
- DROP "Officers can insert approval requests" → CREATE with `has_permission(auth.uid(), 'applications.approve')`
- DROP "Officers can update approval requests" → CREATE with `has_permission(auth.uid(), 'applications.approve')`

**`certificates`:**
- DROP "Officers can insert certificates" → CREATE with `has_permission(auth.uid(), 'certificates.issue')`
- DROP "Officers can update certificates" → CREATE with `has_permission(auth.uid(), 'certificates.update')`

**`certification_decisions`:**
- DROP "Officers can insert decisions" → CREATE with `has_permission(auth.uid(), 'applications.approve')`

**`inspectors`:**
- DROP "Super admins can manage inspectors" → CREATE with `has_permission(auth.uid(), 'inspectors.manage')`

**`audit_logs`:**
- DROP "IT auditors and super admins can view audit logs" → CREATE with `has_permission(auth.uid(), 'audit_logs.view')`

### 2. `src/admin/lib/permissions.ts`
- Add `canViewInspectors: boolean` and `canManageInspectors: boolean` to the `Permission` interface
- Add `'inspectors.view': 'canViewInspectors'` and `'inspectors.manage': 'canManageInspectors'` to `CODE_TO_KEY`
- Add `false` defaults for the new fields in `emptyPermissions()`

### 3. `src/admin/components/layout/AdminSidebar.tsx`
- Change the "Inspectors" nav item permission from `'canManageInspections'` to `'canManageInspectors'`

## Why This Fix Is Correct

The RBAC system's contract is:
> "A user can do X if their role has permission code X"

The database should enforce this same contract. By replacing `has_role('hardcoded_name')` with `has_permission('permission_code')`, the RLS policies enforce exactly the same rules as the frontend permission flags — making the whole system consistent and future-proof. Any new custom role that is granted the right permissions will automatically get database-level access.

## Summary of Changes

| File | Type | Change |
|------|------|--------|
| New migration SQL | Database | Replace 10+ hardcoded `has_role()` RLS policies with `has_permission()` and `is_admin_user()` |
| `src/admin/lib/permissions.ts` | Code | Add `canViewInspectors` and `canManageInspectors` to interface + CODE_TO_KEY |
| `src/admin/components/layout/AdminSidebar.tsx` | Code | Fix Inspectors nav item to use `canManageInspectors` |

No changes needed to `AdminRegister.tsx`, `accept-invitation`, or `send-invitation`.
