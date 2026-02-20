
# Redesign: Permission Matrix & Workflow Stage Assignments — Simple, Complete, Fully Functional

## What I Found After Thorough Investigation

### Database Facts (Confirmed)
- **14 categories** exist in the `permissions` table: Applications, Audit, Certificates, Documentation, Enforcement, Finance, Inspections, Inspectors, Reports, Roles, Shariah Review, Support, System, Users
- **Shariah Review** exists as a full module (6 permissions) — the user wants it **deleted** from the system
- **Inspectors** module only has 2 permissions, both classified as `action_type = 'special'` in the DB — this is why it shows no Create/Read/Update/Delete columns in the matrix
- **Finance** is missing from CIDO's permissions entirely — confirmed by DB query
- The `fetchAllPermissions()` function in `dynamicPermissions.ts` **does NOT include `action_type`** in its SELECT query — it falls back to inferring from the code name, breaking categories like `Inspectors` (where `inspectors.view` has `action_type = 'special'` in DB, not `read`)

### Current UI Problems
1. **Permission Matrix**: Extra Actions column cuts off at 3 items showing "+N more" — critical permissions like `applications.assign` are hidden
2. **Collapsible rows** add unnecessary friction — you must expand each module to see all permissions
3. **Inspectors module**: Both permissions are classified `special` in DB but the inference code treats `inspectors.view` as `read`, causing a mismatch
4. **PERMISSION_MODULES config** references `'Shariah Review'` but the DB category is `'Shariah Review'` (with space) — this is correct but needs cleanup after deletion
5. **Workflow Stages Tab**: No grouping by module — when a role has 30+ permissions, it shows 30+ flat checkboxes per stage (7 stages × 30 = 210+ uncategorized checkboxes)
6. **No "Select All at Stage" button** — admin must check each permission individually per stage
7. **No visual indicators** of what each stage means in plain language

---

## All Changes Required

### Change 1 — Fix `dynamicPermissions.ts`: Include `action_type` in the DB Query

The root data issue. Replace the broken triple-call with a single clean select that includes `action_type`:

```typescript
// BEFORE (broken):
.select('id, code, name, category, description')
// then tries a non-existent RPC, then falls back to inference

// AFTER (correct):
.select('id, code, name, category, description, action_type')
```

This fixes `Inspectors` module — both permissions in DB have `action_type = 'special'`, so they'll correctly show in the Special Actions column only (no phantom Create/Read/Update/Delete slots).

### Change 2 — Remove Shariah Review from the DB and All Code

**Database migration** — delete all Shariah Review permissions and their role assignments:
```sql
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE category = 'Shariah Review');
DELETE FROM workflow_stage_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE category = 'Shariah Review');
DELETE FROM permissions WHERE category = 'Shariah Review';
```

**Code cleanup** in `permissions.ts`:
- Remove `canCreateShariahReview`, `canViewShariahReview`, `canUpdateShariahReview`, `canDeleteShariahReview`, `canSubmitShariahReview`, `canApproveShariahReview` from `Permission` interface
- Remove all Shariah Review entries from `emptyPermissions()`, `CODE_TO_KEY`, `HIGH_RISK_PERMISSIONS`, and `PERMISSION_MODULES`

### Change 3 — Redesign the Permission Matrix (Simple Card Layout)

**Replace the current collapsible table rows with a flat module card grid**. Each module gets one card showing all permissions inline — no expanding, no hiding, no "+N more" truncation.

**New layout per module card:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📋 Applications                                            [5/8 selected]  │
│ Review, approve, and manage certification applications                       │
├───────────────────────────────────────────────────────────────────────────  │
│  Standard Actions                        Special Actions                    │
│  ☑ View    ☑ Create  ☑ Update  ☐ Delete  ☑ Approve  ☐ Reject  ☑ Manage     │
│                                          ☐ Assign                           │
├───────────────────────────────────────────────────────────────────────────  │
│  [Select All]  [Clear All]                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key improvements:**
- **No collapsing** — all permissions visible at once in a clean 2-section layout
- **All special actions shown** — no "+N more" truncation ever
- **Green left border** on modules that have at least one permission selected
- **"Select All" / "Clear All" buttons** per module for speed
- **High-risk badge** shown as a yellow warning pill next to the permission label (not just a tiny icon)
- **Module description** shown as subtitle (from a config object)
- **Selected count badge** (e.g. "5/8") on every module header
- Modules with **zero permissions** (like Audit which only has 1) still show correctly

**Module descriptions to add to `PERMISSION_MODULES`:**

| Module | Description |
|--------|-------------|
| Applications | Review, approve, and manage halal certification applications |
| Documentation | Upload, view, and approve application supporting documents |
| Inspections | Schedule, conduct, and report on facility inspections |
| Finance | View and manage invoices, payments, and billing records |
| Certificates | Issue, update, and revoke halal certificates |
| Enforcement | Issue and manage Non-Conformance Notices (NCNs) |
| Support | View and respond to client support tickets |
| Users | Create, manage, and suspend admin user accounts |
| Roles | Create and configure roles and their permission sets |
| Audit | View the system-wide audit trail and activity logs |
| Reports | Generate and export certification and compliance reports |
| Inspectors | Onboard and manage field inspectors |
| System | Manage system-wide settings and configuration |

### Change 4 — Redesign Workflow Stage Assignments (Timeline with Module Groups)

**Replace the flat list of checkboxes** with a **stage-by-stage timeline** where each stage shows permissions **grouped by module** — just like the Permission Matrix card layout.

**New layout per stage card:**

```
● Stage 1 — Submitted
  "Application has been submitted and awaits initial review."
  ┌──────────────────────────────────────────────────────────────┐
  │ Applications        │ Documentation                          │
  │ ☑ View Applications │ ☑ View Documentation                  │
  │ ☑ Update            │ ☐ Upload Documentation                 │
  ├──────────────────────────────────────────────────────────────┤
  │ [Assign All]  [Clear All]                                    │
  └──────────────────────────────────────────────────────────────┘
```

**Key improvements:**
- **Stage description** at the top in plain English (pulled from `workflow_stages.description` already in DB)
- **Permissions grouped by module** (Applications, Inspections, Finance, etc.) inside each stage — not a flat list of 30+ items
- **Only shows permissions the role already has** (with a tip explaining this)
- **"Assign All" / "Clear All" per stage** for fast configuration
- **Stage number badge** (1–7) as a visual timeline indicator
- **"X permissions assigned" counter** on each stage header
- **If no permissions selected** → shows a clear message: "First grant this role permissions in the Permissions tab above"

### Change 5 — Add Finance Permissions to CIDO Role (Database Migration)

The DB confirms CIDO has zero Finance permissions. This needs to be fixed as part of the implementation by inserting the appropriate `role_permissions` records for CIDO:
- `finance.view` — so CIDO can see invoices
- `finance.manage` — so CIDO can manage billing at the Approved stage

And add Finance workflow stage permissions for both Super Administrator and CIDO at the **Approved** stage.

---

## Files to Change

| File | What Changes |
|------|-------------|
| `src/admin/lib/dynamicPermissions.ts` | Fix `fetchAllPermissions` to include `action_type` in SELECT; remove the broken RPC fallback triple-call |
| `src/admin/lib/permissions.ts` | Remove all Shariah Review entries from interface, `emptyPermissions`, `CODE_TO_KEY`, `HIGH_RISK_PERMISSIONS`, `PERMISSION_MODULES`; add `description` field to `PERMISSION_MODULES` entries |
| `src/admin/pages/RoleEditor.tsx` | Full redesign of Permission Matrix (flat module cards) and Workflow Stage Assignments (timeline with module-grouped permissions + Assign All/Clear All buttons) |
| Database (migration SQL) | Delete Shariah Review permissions + role assignments; add Finance permissions to CIDO role; add Finance workflow stage assignments for both roles at Approved stage |
