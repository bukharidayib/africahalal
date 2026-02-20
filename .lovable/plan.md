
# Two-Fix Plan: Simplify Workflow Stage UI + Fix Certificate RLS Error

---

## Fix 1 — Certificate RLS Error When Approving

### Root Cause (Confirmed)

The `certificates` table INSERT policy is:
```sql
WITH CHECK: has_permission(auth.uid(), 'certificates.issue')
```

In `ApplicationDetail.tsx` lines 345-356, when an application is approved, the frontend directly inserts into `certificates` using the logged-in user's Supabase session. This means the **approving admin must have `certificates.issue` permission** for the insert to succeed.

However, many admin roles (e.g., CIDO) are given `applications.approve` but not `certificates.issue`. They can approve the application, but the certificate insert fails with the RLS violation.

### The Fix

**Database Migration**: Add a new RLS policy that also allows INSERT when the user has `applications.approve` permission — since approving an application is the act that generates a certificate:

```sql
CREATE POLICY "Users with approve permission can issue certificates"
ON public.certificates FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'certificates.issue')
  OR has_permission(auth.uid(), 'applications.approve')
);
```

This is the cleanest fix — no code change required. An admin who can approve an application can also create the certificate that results from that approval. Both permissions logically warrant the ability to issue certificates.

**Why not change the code?**: The code in `ApplicationDetail.tsx` is correct — it generates the certificate server-side from the frontend session. Changing it to a server-side edge function would be a much larger change. The RLS policy fix is precise, targeted, and secure.

---

## Fix 2 — Simplify the Workflow Stage Assignments UI

### Root Cause of Complexity

The current UI shows every single permission the role has as a checkbox inside every stage. A Super Admin role with 30+ permissions sees 30+ checkboxes × 7 stages = 210+ checkboxes to manage. This is overwhelming.

### The New Design: "Stage Goal" Model

Instead of showing every permission as a separate checkbox per stage, redesign the Workflow Stages tab to use a **simple accordion** where each stage shows only the permissions relevant to what actually happens at that stage — not every permission the role has.

**Key insight**: Not all permissions are relevant at all stages. For example:
- `finance.view` doesn't need to be controlled at the "Submitted" stage — only at "Approved"
- `certificates.issue` only matters at the "Approved" stage
- `inspections.schedule` only matters at "Under Review" or "Inspection Scheduled"

### New UI Design

Replace the current grid of all role permissions per stage with a **2-column simple list** grouped by module — but only showing permissions that are **logically relevant** to each stage. The display will be much more scannable:

```
Stage 1 — Submitted          [2 assigned]    [▼ Expand]
Stage 2 — Under Review       [5 assigned]    [▼ Expand]
Stage 3 — Inspection Sched.  [3 assigned]    [▼ Expand]  ← Expanded below
  ┌─────────────────────────────────────────────────┐
  │ ☑ Schedule Inspections    ☑ View Applications   │
  │ ☑ Manage Inspections      ☐ Approve Reports     │
  │ [Assign All]  [Clear All]                       │
  └─────────────────────────────────────────────────┘
Stage 4 — Inspection Comp.   [4 assigned]    [▼ Expand]
Stage 5 — Approved           [6 assigned]    [▼ Expand]
Stage 6 — Rejected           [2 assigned]    [▼ Expand]
Stage 7 — Suspended          [1 assigned]    [▼ Expand]
```

**Key improvements:**
- **Collapsed by default** — only one stage is open at a time (accordion pattern), reducing visual noise from 210 checkboxes to ~5-8 visible at once
- **Simple flat grid** — permissions shown as labeled checkboxes in a 2 or 3-column grid (no module sub-headers inside each stage — that level of grouping adds clutter)
- **Assign All / Clear All** still available per stage for speed
- **Stage header shows count** clearly so admin can scan which stages are configured at a glance
- **Only opens one stage at a time** — clicking another stage closes the previous one
- **Clear empty state** — if a role has no permissions at all, shows a single friendly message on the first stage only

### Files to Change

| File | Change |
|------|--------|
| Database (migration) | Add new INSERT policy: `applications.approve` permission also allows certificate insert |
| `src/admin/pages/RoleEditor.tsx` | Replace the current workflow tab timeline + full permission grid with a collapsed accordion pattern — one stage open at a time, flat permission checkboxes (no module sub-headers within each stage) |

### No Other Files Need to Change

- `ApplicationDetail.tsx` — no change needed, the frontend code is correct
- `permissions.ts` — no change needed
- `dynamicPermissions.ts` — no change needed
- No other RLS policies need updating

