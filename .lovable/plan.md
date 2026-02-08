

# Enterprise RBAC + Workflow Admin Module

## Current State Assessment

The platform already has a solid foundation:
- **5 system roles** in `admin_roles` table (super_admin, certification_officer, finance_officer, it_system_auditor, support_agent)
- **21 permissions** in the `permissions` table across 6 categories
- **Role Editor** page (`/admin/roles/:id`) with permission checkbox matrix
- **User Management** page (`/admin/users`) with role assignment, role changes with reason, and audit logging
- **Workflow Engine** (`workflowEngine.ts`) with basic resource+action permission mapping
- **AdminLayout** that redirects unauthenticated users to `/admin/login`
- **AdminSidebar** that filters nav items by permission
- **Audit Logs** page showing immutable system activity

### What's Missing (Gap Analysis)

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Role status (Active/Suspended) | No status column on `admin_roles` | Need `status` column + UI toggle |
| Role suspension cascading to users | Not implemented | Need real-time access revocation |
| Workflow stage permissions | No `workflow_stages` or `workflow_stage_permissions` tables | Need new tables + permission matrix UI |
| Permission matrix by module/feature/CRUD/stage | Flat checkbox list grouped by category | Need structured matrix view |
| High-risk permission warnings | Not implemented | Need UI warnings for sensitive permissions |
| Self-approval prevention | `validate_dual_approval` function exists but not workflow-integrated | Need enforcement in workflow engine |
| Admin override with reason | Partial (role changes require reason) | Extend to all override actions |
| RBAC dashboard analytics | Basic stats only (applications, certificates) | Need role/permission/security analytics |
| Documentation/Shariah Review/Finance modules in permissions | Not in permission list | Need new permissions seeded |
| Forward-only stage progression | Not enforced | Need server-side stage validation |
| One user = one role enforcement | Checked in UI only | Need DB constraint |

---

## Implementation Plan

### Phase 1: Database Schema Extensions (SQL Migration)

**1a. Add `status` column to `admin_roles`**
```
ALTER TABLE admin_roles ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));
```

**1b. Create `workflow_stages` table**
Defines the system's certification workflow stages:
- Application Submission
- Documentation Review
- Inspection
- Shariah Review
- Certificate Issuance
- Surveillance & Renewal

Columns: `id`, `name`, `system_code`, `display_name`, `stage_order`, `description`, `is_active`

**1c. Create `workflow_stage_permissions` table**
Maps which roles can act at which stage with which actions:
- `id`, `stage_id` (FK to workflow_stages), `role_id` (FK to admin_roles), `permission_id` (FK to permissions), `created_at`

**1d. Add new permissions for missing modules**
Seed additional permissions for:
- Documentation: `documentation.view`, `documentation.approve`, `documentation.upload`
- Shariah Review: `shariah_review.view`, `shariah_review.submit`, `shariah_review.approve`
- Finance: `finance.view`, `finance.manage`, `finance.approve`
- Reports: `reports.view`, `reports.export`

**1e. Add unique constraint for one-user-one-role**
```
ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id);
```
This enforces at the database level that each user can have only one role.

**1f. Create workflow validation function**
A `SECURITY DEFINER` function `can_perform_workflow_action(user_id, stage_code, permission_code)` that checks:
1. User has an active role (role status = 'active')
2. User's role has the required permission
3. User's role is allowed at the specified workflow stage
4. User is not the same person who performed the previous stage (self-approval prevention)

**1g. Create role change logging trigger**
A trigger on `user_roles` that auto-logs INSERT/UPDATE/DELETE to `audit_logs`.

---

### Phase 2: Enhanced Role Management Page

**File: `src/admin/pages/RolesPermissions.tsx`** (extend existing)

New features:
- **Status badge** per role showing Active/Suspended with color coding
- **Activate/Suspend toggle** button (admin only, with confirmation dialog + reason)
- **User count per role** (already exists, keep)
- **System Code** column in the table
- **Warning banner** when suspending a role: "This will immediately revoke access for X users"
- **Suspend confirmation dialog** with mandatory reason field

Access: Restricted to users with `canManageRoles` permission (effectively `super_admin` or roles with `roles.manage`).

---

### Phase 3: Enhanced Permission Management with Matrix View

**File: `src/admin/pages/RoleEditor.tsx`** (extend existing)

Transform the flat checkbox list into a structured, enterprise-grade permission matrix:

- **Module-level grouping** (Applications, Documentation, Inspections, Shariah Review, Finance, Certificates, Users, Reports, Audit Logs, System)
- **Feature-level sub-items** under each module (e.g., under Inspections: View, Schedule, Create Report, Approve Report)
- **CRUD indicators** shown as icons/tags on each permission
- **High-risk permission warnings** - visual alert icons next to permissions like `certificate.issue`, `certificate.revoke`, `roles.manage`, `users.manage` with tooltip explaining the risk
- **Select All / Deselect All per module** (already exists per category, will align)
- **Disabled states** for system role restrictions

**New Tab: "Workflow Stages"** in the Role Editor
- A secondary tab showing which workflow stages this role can participate in
- Checkbox matrix: Stages (rows) x Permissions (columns)
- Only permissions relevant to each stage are shown
- Clear visual indication of which stages this role is responsible for

---

### Phase 4: Enhanced User Management

**File: `src/admin/pages/UserManagement.tsx`** (extend existing)

New features:
- **View User Permissions** button - opens a read-only dialog showing all permissions inherited from the user's role
- **Role change confirmation dialog** enhanced with:
  - Current role displayed
  - New role selected
  - Mandatory reason field (already exists)
  - Impact warning: "This user will gain/lose access to X modules"
- **Suspend/Deactivate user** action (removes their role assignment, with reason)
- **Status indicator** showing if user's role is suspended (inherited from role status)
- **Filter by role** dropdown
- **Filter by status** (Active / Suspended)

---

### Phase 5: Workflow Permission Engine Enhancement

**File: `src/admin/lib/workflowEngine.ts`** (rewrite)

Enhanced WorkflowEngine class:
- `canActInStage(userId, stageCode, permissionCode)` - checks stage + permission + role status
- `canProgressStage(applicationId, userId, fromStage, toStage)` - validates forward-only progression
- `isNotSelfApproving(applicationId, userId, stageCode)` - prevents self-approval by checking who acted in the previous stage
- `getAvailableActions(userId, stageCode)` - returns all actions a user can perform at a given stage
- `getRoleStages(roleId)` - returns which stages a role can participate in

All methods use the server-side `can_perform_workflow_action` DB function for authoritative checks.

**New File: `src/admin/hooks/useWorkflowPermission.ts`**
React hook for UI-level permission enforcement:
```typescript
function useWorkflowPermission(stageCode: string, permissionCode: string) {
  // Returns { isAllowed, isLoading, reason }
}
```

---

### Phase 6: RBAC Analytics Dashboard

**File: `src/admin/pages/AdminDashboard.tsx`** (extend existing)

Add new analytics cards (visible only to `super_admin` / users with `roles.manage`):
- **Total Admin Users** count
- **Users per Role** - small bar/list showing distribution
- **Permission Coverage** - percentage of permissions assigned across all roles
- **Roles by Status** - Active vs Suspended count
- **Recent Role Changes** - last 5 role assignment/change audit logs
- **Recent Security Events** - failed login attempts, unauthorized access attempts from audit logs

Uses the existing Card/Badge/Table components consistent with current dashboard design.

---

### Phase 7: Security & Access Control Hardening

**Client-side:**
- Every admin page wrapped in `AdminLayout` (already done) which checks `isAuthenticated`
- Sidebar items filtered by permissions (already done)
- Individual page sections guarded by specific permission checks

**Server-side:**
- All RLS policies already use `is_admin_user()` and `has_role()` SECURITY DEFINER functions
- New `can_perform_workflow_action()` function for stage-based checks
- Role status check added to `is_admin_user()` - suspended roles return false
- `validate_dual_approval()` integrated with workflow engine

**Audit logging:**
- All role CRUD operations logged (via `log_audit` RPC)
- All permission changes logged
- All role assignments and changes logged with reason
- Admin override actions flagged with `reason_code = 'admin_override'`

---

## File Changes Summary

| Category | File | Action | Description |
|----------|------|--------|-------------|
| **Database** | New migration SQL | Create | Schema extensions: status column, workflow tables, new permissions, constraints, functions |
| **Types** | `src/integrations/supabase/types.ts` | Modify | Add workflow_stages, workflow_stage_permissions table types; update admin_roles with status |
| **Permissions** | `src/admin/lib/permissions.ts` | Modify | Add new permission keys for documentation, shariah, finance, reports |
| **Workflow** | `src/admin/lib/workflowEngine.ts` | Rewrite | Full enterprise workflow engine with stage, self-approval, forward-only checks |
| **Hooks** | `src/admin/hooks/useWorkflowPermission.ts` | Create | React hook for stage-based permission checks |
| **Roles Page** | `src/admin/pages/RolesPermissions.tsx` | Modify | Add status column, activate/suspend with confirmation, system code display |
| **Role Editor** | `src/admin/pages/RoleEditor.tsx` | Modify | Structured permission matrix, high-risk warnings, workflow stages tab |
| **User Mgmt** | `src/admin/pages/UserManagement.tsx` | Modify | View permissions dialog, enhanced role change, status filters |
| **Dashboard** | `src/admin/pages/AdminDashboard.tsx` | Modify | RBAC analytics section for admin users |
| **Dynamic Perms** | `src/admin/lib/dynamicPermissions.ts` | Modify | Add workflow stage permission fetching and saving functions |
| **Sidebar** | `src/admin/components/layout/AdminSidebar.tsx` | Modify | Add `canManageRoles` permission check for Roles nav item |
| **Auth Hook** | `src/admin/hooks/useAdminAuth.ts` | Modify | Check role status (suspended roles denied access) |

---

## Design Constraints Compliance

- All new UI uses existing components: Card, Table, Badge, Dialog, Button, Input, Select, Checkbox, Tabs, Separator
- Same AdminLayout wrapper for all pages
- Same typography (font-serif headings, text-muted-foreground descriptions)
- Same spacing patterns (space-y-6, gap-4)
- Same color scheme (primary, destructive, warning tones from existing pages)
- No new design system or third-party UI library

---

## Technical Notes

- The `admin_roles` table `status` field is checked inside `is_admin_user()` so suspended roles lose access across all RLS policies automatically
- One-user-one-role is enforced at DB level with a UNIQUE constraint on `user_roles.user_id`
- Workflow stages are system-defined (seeded via migration) and not editable via UI
- Forward-only stage progression is enforced by comparing `stage_order` values
- Self-approval prevention checks `application_status_history.changed_by` for the previous stage
- All new permission codes follow the existing `module.action` naming convention

