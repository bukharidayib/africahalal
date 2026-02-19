
# Fix: Align Workflow Stages with Your 7 Application Statuses and Make Permissions Work End-to-End

## What You Have vs. What You Need

### The Problem in Plain Language

Your system has a **mismatch** in three places:

**1. Workflow Stages in the database (6 stages — wrong names):**
```
Stage 1: APPLICATION      → Application Submission
Stage 2: DOC_REVIEW       → Documentation Review
Stage 3: INSPECTION       → Inspection
Stage 4: SHARIAH          → Shariah Review        ← not one of your 7 statuses
Stage 5: CERT_ISSUE       → Certificate Issuance
Stage 6: SURVEILLANCE     → Surveillance & Renewal ← not one of your 7 statuses
```

**2. Your 7 application statuses (what you actually use):**
```
submitted
under_review
awaiting_inspection   (displayed as "Inspection Scheduled")
inspection_complete   (displayed as "Inspection Completed")
approved
rejected
suspended
```

**3. The Workflow Stage Permissions — barely configured:**
- `super_admin` has **zero** workflow stage assignments — meaning even super admins technically fail the strict `can_perform_workflow_action()` check
- `cido` only has DOC_REVIEW and APPLICATION stages — incomplete

These three layers need to be aligned so that:
- A role's permissions tell WHAT they can do
- The workflow stage assignments tell AT WHICH STAGE they can do it
- The application status tells WHERE in the process an application is

---

## The Full Fix: 3 Parts

---

### Part 1 — Replace the 6 Workflow Stages with Your Exact 7 Statuses (Database Migration)

The workflow stages need to match your actual application lifecycle exactly. We will:
- Delete all existing workflow stages and their permissions
- Insert 7 new stages that perfectly match your 7 application statuses

**New workflow stages (matching your business flow):**

| Stage Order | System Code | Display Name | Maps to Application Status |
|-------------|-------------|--------------|---------------------------|
| 1 | `SUBMITTED` | Submitted | `submitted` |
| 2 | `UNDER_REVIEW` | Under Review | `under_review` |
| 3 | `INSPECTION_SCHEDULED` | Inspection Scheduled | `awaiting_inspection` |
| 4 | `INSPECTION_COMPLETED` | Inspection Completed | `inspection_complete` |
| 5 | `APPROVED` | Approved | `approved` |
| 6 | `REJECTED` | Rejected | `rejected` |
| 7 | `SUSPENDED` | Suspended | `suspended` |

**Why this is the right approach:** The workflow stage system is designed to control WHO can do WHAT at each point in the process. By naming stages after your actual statuses, the Role Editor becomes intuitive — when you open Stage 3 "Inspection Scheduled", you know exactly which applications are in that stage and what permissions are needed.

---

### Part 2 — Seed Correct Workflow Stage Permissions for Both Roles (Database Migration)

After creating the correct stages, we need to assign permissions to roles at each stage. This is the data currently missing from `workflow_stage_permissions`.

**For `super_admin` — full access at every stage:**

| Stage | Permissions Assigned |
|-------|---------------------|
| Submitted | applications.view, applications.update, applications.manage |
| Under Review | applications.view, applications.update, applications.approve, applications.reject, documentation.view, documentation.approve |
| Inspection Scheduled | applications.view, inspections.view, inspections.manage, inspections.schedule |
| Inspection Completed | applications.view, inspections.view, inspections.approve_report, applications.update |
| Approved | applications.view, certificates.view, certificates.issue, certificates.update |
| Rejected | applications.view, applications.update |
| Suspended | applications.view, applications.update, certificates.update, certificates.revoke |

**For `cido` — appropriate access based on their role (Certification and Inspection Delivery Officer):**

| Stage | Permissions Assigned |
|-------|---------------------|
| Submitted | applications.view |
| Under Review | applications.view, applications.update, documentation.view, documentation.approve |
| Inspection Scheduled | applications.view, inspections.view, inspections.schedule, inspections.manage |
| Inspection Completed | applications.view, inspections.view, inspections.approve_report, applications.update |
| Approved | applications.view, certificates.view, certificates.issue |
| Rejected | applications.view |
| Suspended | applications.view |

**Important note:** The `cido` role already has the right global permissions. The workflow stage assignments above tell the system at WHICH stage those permissions can actually be exercised.

---

### Part 3 — Fix the ApplicationDetail Status Update Panel (Code)

Currently the Status Update dropdown in `ApplicationDetail.tsx` shows an option called `"awaiting_inspection"` mapped to label `"Inspection Scheduled"` — which is correct. However, the dropdown **does not enforce any workflow permission check** before letting any admin change any status. We need to:

1. Map each application status to its corresponding new workflow stage code so the UI can check permissions
2. Show which status transitions are allowed for the current user based on their role's workflow stage permissions
3. Disable status options the current user's role is not permitted to set

**Status → Stage mapping (for permission enforcement):**
```
submitted           → SUBMITTED
under_review        → UNDER_REVIEW
awaiting_inspection → INSPECTION_SCHEDULED
inspection_complete → INSPECTION_COMPLETED
approved            → APPROVED
rejected            → REJECTED
suspended           → SUSPENDED
```

---

### Part 4 — Update the ApplicationTracker Client Component (Code)

The `ApplicationTracker.tsx` shown to clients currently only shows 5 steps in the visual stepper (skipping Rejected and Suspended as separate visual states). We need to ensure it correctly reflects all 7 statuses so clients always see an accurate picture.

The tracker currently has:
```
Submitted → Under Review → Inspection Scheduled → Inspection Completed → Approved
```

This is fine as a happy-path flow — but the status labels displayed at the bottom (next step text) need to be complete and accurate for all 7 statuses including Rejected and Suspended.

---

## Technical Summary of All Changes

### Database Migration (SQL)
```sql
-- 1. Remove old workflow_stage_permissions (they reference old stage IDs)
-- 2. Remove old workflow_stages (the 6 mismatched ones)
-- 3. Insert 7 new workflow stages matching your application statuses
-- 4. Insert workflow_stage_permissions for super_admin at all 7 stages
-- 5. Insert workflow_stage_permissions for cido at all 7 stages
```

### Code Changes

| File | What Changes |
|------|-------------|
| `src/admin/pages/ApplicationDetail.tsx` | Add permission checking per stage before allowing status transitions; map status values to stage codes |
| `src/components/ApplicationTracker.tsx` | Minor: ensure all 7 status labels show correctly for client-facing view |

---

## What This Means in Practice After the Fix

**When a CIDO user opens an application and tries to change status:**
1. The system checks their role's `workflow_stage_permissions` for the **target status's stage**
2. If they have `applications.update` at that stage → the option is available
3. If they don't → the option is grayed out with a tooltip explaining why

**When a Super Admin opens an application:**
- All status options are available (they have permissions at every stage)

**In the Role Editor → Workflow Stages tab:**
- You will now see 7 stages matching your exact business process
- Each stage shows checkboxes for what permissions that role can exercise there
- This is fully manageable by any Super Admin going forward

---

## Files to Change

| File | Type | Description |
|------|------|-------------|
| New migration SQL | Database | Replace 6 old stages with 7 correct ones + seed all stage permissions for both roles |
| `src/admin/pages/ApplicationDetail.tsx` | Code | Add per-status permission gating in the status update panel |
| `src/components/ApplicationTracker.tsx` | Code | Ensure all 7 statuses render correctly in the client-facing tracker |
