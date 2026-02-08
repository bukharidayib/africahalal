

# Remove System Roles + Restructure Permissions to Enterprise CRUD Matrix

## Overview

This plan converts all roles from "System" to "Custom" (fully editable/deletable), restructures the permissions into a proper Module-level CRUD matrix with extra actions, and makes the auth system fully dynamic (no more hardcoded role-permission mapping).

---

## What Changes

### 1. Database Migration (SQL)

**a) Convert all roles to Custom**
```sql
UPDATE admin_roles SET is_system_role = false;
```

**b) Fix 2 RLS policies** that reference `is_system_role`
- `blogs` table: "Admin full access for blogs" -- replace `ar.is_system_role = true` with `is_admin_user(auth.uid())`
- `organization_supervisors` table: "Admin full access for supervisors" -- same fix

**c) Add missing CRUD-level permissions** to fill the matrix properly. Currently many modules only have "view" and "manage". We need proper Create/Read/Update/Delete + module-specific extras:

| Module | Existing | New Permissions to Add |
|--------|----------|----------------------|
| Applications | view, manage, assign | create, update, delete, approve, reject |
| Documentation | view, approve, upload | create, update, delete |
| Inspections | view, manage, schedule | create, update, delete, approve_report |
| Shariah Review | view, submit, approve | create, update, delete |
| Finance | view, manage, approve | create, update, delete |
| Certificates | view, issue, revoke | create, update, delete |
| Enforcement | view, manage | create, update, delete |
| Support | view, respond, manage | create, update, delete |
| Users & Roles | users.manage, roles.manage, audit_logs.view | users.create, users.view, users.update, users.delete, roles.view, roles.create, roles.update, roles.delete |
| Reports | view, export | create, delete |
| System | settings.manage | settings.view, settings.update |

**d) Reorganize permission categories** for clarity:
- Rename "Users & Roles" category to split into "Users" and "Roles"
- Rename "Inspectors" to merge under "Inspections" module
- Ensure every permission has a proper `description`

**e) Tag permissions with CRUD type** by adding an `action_type` column to the `permissions` table:
```sql
ALTER TABLE permissions ADD COLUMN action_type TEXT DEFAULT 'special'
  CHECK (action_type IN ('create', 'read', 'update', 'delete', 'special'));
```
This enables the UI to render a proper CRUD matrix where standard CRUD operations appear as columns and "special" actions (Approve, Issue, Revoke, etc.) appear separately.

---

### 2. Auth System -- Switch to Fully Dynamic Permissions

**File: `src/admin/hooks/useAdminAuth.ts`**

The current auth hook uses a hardcoded `getPermissions(role)` lookup table. This means custom roles always get zero permissions regardless of their DB configuration.

Change: After fetching the user's role name, also call `get_user_permissions` RPC to get the actual permission codes from the database. Then use `convertToLegacyPermissions()` to build the Permission object.

```
Before: role -> getPermissions(role) [hardcoded map]
After:  userId -> get_user_permissions(userId) -> convertToLegacyPermissions(codes)
```

**File: `src/admin/lib/permissions.ts`**

- Keep the `Permission` interface (it's used everywhere for type safety)
- Keep `getPermissions()` as a fallback only
- Remove the hardcoded `rolePermissions` map -- it's no longer the source of truth
- Add new permission keys to the `Permission` interface and `convertToLegacyPermissions()` for the new CRUD permissions
- Update `HIGH_RISK_PERMISSIONS` array with the new permission codes

**File: `src/admin/lib/dynamicPermissions.ts`**

- Update `convertToLegacyPermissions()` to map all new CRUD permission codes
- Add new keys for Create, Update, Delete permissions

---

### 3. Role Management Page -- Remove System Badge

**File: `src/admin/pages/RolesPermissions.tsx`**

- Remove the "Type" column that shows System/Custom badge
- Remove the `is_system_role` check that prevents deletion of system roles -- ALL roles can now be deleted (with a safeguard: cannot delete a role if it has assigned users)
- Keep the Status (Active/Suspended) column
- Keep the Suspend/Activate toggle
- Add safeguard: show warning and block deletion if role has users assigned

---

### 4. Role Editor -- Enterprise Permission Matrix

**File: `src/admin/pages/RoleEditor.tsx`**

Replace the current flat checkbox grid with a structured CRUD matrix table:

```
+-------------------+--------+------+--------+--------+--------------------+
| Module            | Create | Read | Update | Delete | Extra Actions      |
+-------------------+--------+------+--------+--------+--------------------+
| Applications      |  [x]   | [x]  |  [x]   |  [x]  | Assign, Approve,   |
|                   |        |      |        |        | Reject             |
+-------------------+--------+------+--------+--------+--------------------+
| Documentation     |  [x]   | [x]  |  [x]   |  [x]  | Upload, Approve    |
+-------------------+--------+------+--------+--------+--------------------+
| Inspections       |  [x]   | [x]  |  [x]   |  [x]  | Schedule,          |
|                   |        |      |        |        | Approve Report     |
+-------------------+--------+------+--------+--------+--------------------+
| Shariah Review    |  [x]   | [x]  |  [x]   |  [x]  | Submit, Approve    |
+-------------------+--------+------+--------+--------+--------------------+
| Finance           |  [x]   | [x]  |  [x]   |  [x]  | Approve            |
+-------------------+--------+------+--------+--------+--------------------+
| Certificates      |  [x]   | [x]  |  [x]   |  [x]  | Issue, Revoke      |
+-------------------+--------+------+--------+--------+--------------------+
| ... more modules                                                         |
+-------------------+--------+------+--------+--------+--------------------+
```

Features:
- Each row is a Module (expandable/collapsible)
- Standard CRUD columns with checkboxes
- "Extra Actions" column shows module-specific permissions with individual checkboxes
- High-risk permissions (Approve, Issue, Revoke, Manage Roles) show amber warning icons
- "Select All" per row (toggles all CRUD + extras for that module)
- Module permission count badge (e.g., "3/7")
- Remove the System Role badge from the header
- Keep the Workflow Stages tab unchanged

---

### 5. Minor UI Updates

**File: `src/admin/pages/RoleEditor.tsx` (header section)**
- Remove the "System Role" badge display

**File: `src/admin/lib/dynamicPermissions.ts`**
- In `deleteRole()`, remove the `.eq('is_system_role', false)` filter so all roles are deletable
- In `fetchRolesWithPermissions()`, remove `.order('is_system_role', ...)` since it no longer matters

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| New SQL migration | Create | Convert roles, fix RLS, add permissions, add `action_type` column |
| `src/integrations/supabase/types.ts` | Modify | Add `action_type` to permissions table type |
| `src/admin/hooks/useAdminAuth.ts` | Modify | Fetch dynamic permissions from DB instead of hardcoded map |
| `src/admin/lib/permissions.ts` | Modify | Add new Permission keys, update `convertToLegacyPermissions`, remove hardcoded rolePermissions |
| `src/admin/lib/dynamicPermissions.ts` | Modify | Update `convertToLegacyPermissions`, remove `is_system_role` filters, update `deleteRole` |
| `src/admin/pages/RolesPermissions.tsx` | Modify | Remove Type column, allow all roles to be deleted with safeguards |
| `src/admin/pages/RoleEditor.tsx` | Rewrite | Enterprise CRUD permission matrix table, remove System Role badge |

---

## Security Notes

- The `is_admin_user()` DB function does NOT reference `is_system_role` -- it only checks `ar.status = 'active'`, so converting roles to custom has zero impact on RLS security
- The `has_role()` function checks by role name, not by `is_system_role`, so no impact
- Only 2 RLS policies reference `is_system_role` (blogs and organization_supervisors) -- both will be fixed to use `is_admin_user()` instead
- Safeguard: roles with assigned users cannot be deleted (prevents orphaning)
- All permission changes continue to be audit-logged

