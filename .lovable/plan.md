# RBAC Deep Audit — Findings & Remediation Plan

## Audit Summary

I audited the admin RBAC end-to-end across the database, auth context, sidebar, and every admin page. The **foundation is solid** (DB-driven roles/permissions, RLS on all RBAC tables, security-definer functions, workflow stage engine), but **enforcement is inconsistent at the page level** — many pages render and execute mutations without checking permissions.

### What Works Well
- `permissions` table fully populated (64 permissions across 13 categories).
- `has_permission`, `get_user_permissions`, `can_perform_workflow_action`, `check_self_approval`, `validate_stage_progression` all present and security-definer.
- RLS enabled on `admin_roles`, `user_roles`, `permissions`, `role_permissions`, `workflow_stages`, `workflow_stage_permissions`.
- `useAdminAuth` correctly fetches role + permissions from DB, blocks suspended roles, and refreshes on auth events.
- Workflow engine (`workflowEngine.ts`) correctly delegates to RPCs; self-approval prevention exists.
- Sidebar filters nav items by permission key.

### Critical Gaps Found

**1. Role coverage is dangerously thin.** Only `super_admin` has the full 64 permissions. `cido` has 15, `finance` has 6, `inspection_manager` has 9. Many real-world flows will silently fail for non-super-admin users.

**2. 15 of 21 admin pages have zero permission checks.** They rely solely on the sidebar hiding the link, which is **not security** — anyone can deep-link the URL. Affected pages:
```
AdminBilling, Applications, AuditLogs, Blogs, Certificates,
CertificateDetail, Enforcement (already ok via sidebar?), IngredientTracker,
InspectionDetail, Inspectors, Supervisors, AdminSupportCenter,
AdminSupportTickets, AdminSupportChats, AdminSupervisorReportDetail
```

**3. Sidebar key mismatches.**
- "Pending Approvals" gated on `canIssueCertificates` — should be `canApproveApplications`.
- "Ingredient Tracker" gated on `canViewApplications` — no dedicated permission exists.
- "Blog CMS" gated on `canManageSettings` — no `blogs.*` permission category exists.
- "Supervisors" reuses `canManageUsers` — no `supervisors.*` permission exists.

**4. Missing permission categories in DB.** `blogs.*`, `supervisors.*`, `ingredients.*`, `quotations.*`, `invoices.*` do not exist as discrete permissions, so the matrix in Roles & Permissions cannot grant fine-grained access for these modules.

**5. Action-level checks missing on mutations.** Buttons that issue/revoke certificates, approve applications, send invoices, schedule inspections, suspend users etc. are rendered unconditionally inside pages and rely on RLS at the DB layer (which is the right backstop, but UX-wise users see buttons that 403).

**6. Workflow stage permissions only configured for `super_admin` and partially `cido`.** `finance` and `inspection_manager` have NO workflow stage assignments → `can_perform_workflow_action` will return false for every stage transition for them.

**7. `inspection_manager` role display name has typo** ("inspection Manager" — lower-case i).

---

## Remediation Plan (build mode)

### Phase A — Database hardening (1 migration)

1. **Add missing permission categories** (idempotent INSERTs):
   - `blogs.view`, `blogs.create`, `blogs.update`, `blogs.delete`, `blogs.publish`
   - `supervisors.view`, `supervisors.manage`, `supervisors.invite`, `supervisors.delete`
   - `ingredients.view`, `ingredients.analyze`, `ingredients.manage`
   - `quotations.view`, `quotations.create`, `quotations.send`, `quotations.approve`
   - `invoices.view`, `invoices.create`, `invoices.send`, `invoices.void`
   - `payments.view`, `payments.record`, `payments.refund`
   - `dashboard.view` (baseline for all admin roles)

2. **Seed sensible defaults for existing non-super roles** so they are usable out of the box:
   - `cido` (Chief Inspection & Documentation Officer): full applications, documentation, inspections, certificates, enforcement, blogs.view, dashboard.view, audit_logs.view, supervisors.view.
   - `finance`: full finance/quotations/invoices/payments + applications.view, certificates.view, dashboard.view.
   - `inspection_manager`: full inspections + inspectors.manage, supervisors.manage, applications.view, dashboard.view, audit_logs.view.

3. **Seed workflow_stage_permissions** for `cido`, `finance`, `inspection_manager` across all 7 stages so the workflow engine returns true where appropriate.

4. **Fix typo**: update `admin_roles.display_name` for `inspection_manager` → "Inspection Manager".

### Phase B — Permission map & UI gating

5. **Extend `src/admin/lib/permissions.ts`**:
   - Add `Permission` keys for new categories (canViewBlogs, canManageBlogs, canViewSupervisors, canManageSupervisors, canViewIngredients, canManageIngredients, canViewQuotations, canCreateQuotations, canViewInvoices, canCreateInvoices, canViewPayments, canViewDashboard).
   - Add corresponding entries in `CODE_TO_KEY`.

6. **Fix sidebar gating** (`AdminSidebar.tsx`):
   - Pending Approvals → `canApproveApplications`
   - Ingredient Tracker → `canViewIngredients`
   - Blog CMS → `canViewBlogs`
   - Supervisors → `canViewSupervisors`
   - Accountant → `canViewFinance` (unchanged, already correct)

### Phase C — Page-level guards (the critical UX/security fix)

7. **Create reusable guard component** `src/admin/components/PermissionGate.tsx`:
   ```tsx
   <PermissionGate require="canViewCertificates" fallback={<AccessDenied/>}>
     {children}
   </PermissionGate>
   ```
   And `src/admin/components/AccessDenied.tsx` (consistent 403 screen).

8. **Wrap every admin page top-level** with the appropriate permission requirement:
   | Page | Required |
   |---|---|
   | Applications, ApplicationDetail | canViewApplications |
   | Certificates, CertificateDetail | canViewCertificates |
   | Inspections, InspectionDetail | canViewInspections |
   | Inspectors | canManageInspectors |
   | Supervisors | canViewSupervisors |
   | Enforcement | canViewEnforcement |
   | AdminBilling | canViewFinance |
   | AuditLogs | canViewAuditLogs |
   | Blogs | canViewBlogs |
   | IngredientTracker | canViewIngredients |
   | AdminSupport* | canViewSupport |
   | PendingApprovals | canApproveApplications |
   | AdminSupervisorReportDetail | canViewSupervisors |

9. **Action-level button gating** on mutation buttons inside pages (hide or disable with tooltip):
   - Issue / Revoke / Suspend on `CertificateDetail` → `canIssueCertificates` / `canRevokeCertificates`.
   - Approve / Reject on `PendingApprovals` and `ApplicationDetail` → `canApproveApplications` / `canRejectApplications`.
   - Schedule inspection on `Inspections` → `canScheduleInspections`.
   - Invite/Edit/Remove inspector on `Inspectors` → `canManageInspectors`.
   - Create/Send invoice / quotation / record payment in `AdminBilling` tabs → respective new permissions.
   - Publish blog in `Blogs` → `canManageBlogs` (or new `blogs.publish`).

### Phase D — Verification

10. **Manual matrix test** with the existing `cido` user after Phase A seeding: log in, walk every sidebar item, confirm correct access vs. denial.
11. **Run Supabase linter** to catch any RLS regression introduced by the migration.
12. **Add an "Effective Permissions" panel** on `RolesPermissions` page (read-only summary of what a role can do, derived from `permissions` + `role_permissions` + `workflow_stage_permissions`) — so admins can audit roles visually.

---

## Out of Scope (for this pass)
- Re-architecting workflow stages (current 7-stage model is sufficient).
- Migrating to Clerk JWT (memory note exists; not requested here).
- Client/Inspector/Supervisor portal RBAC (those use separate guards; this audit is admin-only as requested).

---

## Deliverables
- 1 SQL migration (Phase A).
- Updated `permissions.ts`, `AdminSidebar.tsx` (Phase B).
- New `PermissionGate.tsx` + `AccessDenied.tsx`, page wrappers across ~15 pages, action-level guards on ~10 buttons (Phase C).
- Fix `inspection_manager` display name typo.
- Brief verification notes after implementation.

Approve to proceed and I'll implement Phases A–C in one pass, then verify.