

## Inspectors Module Overhaul — Invitations, Edit/Delete, Manager Role, Business Assignments

Mirror the existing supervisor invitation pattern for inspectors, expand the Add dialog, add Edit/Delete, and introduce an Inspector Manager who oversees multiple businesses and inspectors.

### 1. Database changes (migration)

**Add columns to `inspectors`:**
- `nrc_number text`
- `address text`
- `full_name text` (denormalized, captured at invitation time so admins can see it before signup)

**New table `inspector_invitations`** (mirrors `supervisor_invitations`):
`id, email, full_name, nrc_number, address, organization_ids uuid[], is_manager bool, invited_by, status, token, expires_at, accepted_at, cancelled_at, created_at, updated_at` + RLS (admin only) + updated_at trigger.

**New table `inspector_organizations`** — links an inspector to one or more client organizations (businesses):
`id, inspector_id, organization_id, assigned_by, assigned_at` with UNIQUE(inspector_id, organization_id). RLS: admins manage; inspector can SELECT own rows.

**New table `inspector_manager_inspectors`** — links a manager (an inspector with `is_manager=true`) to the inspectors they oversee:
`id, manager_id, inspector_id, assigned_by, assigned_at` with UNIQUE(manager_id, inspector_id). RLS: admins manage; manager can SELECT own rows.

### 2. Edge functions

- **`send-inspector-invitation`** — admin-only, sends branded Resend email with a registration link `/inspector/register?email=…&token=…`. Same template style as supervisor invitation, but routed to the inspector portal.
- **`accept-inspector-invitation`** — token validation, marks invitation accepted, then on profile creation creates the `inspectors` row (copying full_name/NRC/address), inserts `inspector_organizations` rows for each assigned business, and sets `is_manager` if invitation flagged it.

### 3. New page: `src/pages/inspector/InspectorRegister.tsx`
Mirror `SupervisorRegister.tsx` — email locked from token, password setup, calls `accept-inspector-invitation`, redirects to `/inspector/signin`. Add route in `App.tsx`.

### 4. Admin Inspectors page (`src/admin/pages/Inspectors.tsx`)

**Replace current Add dialog** with two-tab dialog:
- **Tab "Inspector"** (default): Email, Full Name, NRC Number, Address, multi-select businesses (searchable list of `organizations`), Specializations, Regions. On submit → insert `inspector_invitations` row → invoke `send-inspector-invitation`.
- **Tab "Inspector Manager"**: same fields + checkbox "Grant manager privileges" (sets `is_manager=true`), plus a multi-select of existing inspectors to oversee (creates `inspector_manager_inspectors` rows once the manager accepts).

**Add Edit dialog** — pencil icon now opens a dialog to update: full_name, nrc_number, address, specializations, regions, assigned businesses, is_manager flag, managed inspectors.

**Add Delete action** — trash icon with confirmation `AlertDialog`. Hard-delete the `inspectors` row (cascade removes assignments). Audit-logged.

**New columns in the inspectors table**: "Role" badge (Inspector / Manager), "Businesses" count badge, NRC.

**New "Pending Invitations" section** — list pending `inspector_invitations` with Resend / Cancel actions (mirrors what already exists for admin invitations).

### 5. Manager portal wiring (already exists)

The `is_manager` flag and `/inspector/manager/*` pages are already present. Update `InspectorManagerInspections.tsx` and `InspectorManagerSupervisors.tsx` queries to filter by `inspector_manager_inspectors` (only inspectors assigned to this manager) and by `inspector_organizations` (only those businesses' inspections/reports), instead of returning everything.

### 6. Files touched

- New: `supabase/migrations/<timestamp>_inspector_invitations.sql`
- New: `supabase/functions/send-inspector-invitation/index.ts`
- New: `supabase/functions/accept-inspector-invitation/index.ts`
- New: `src/pages/inspector/InspectorRegister.tsx`
- Edited: `src/admin/pages/Inspectors.tsx` (full overhaul)
- Edited: `src/App.tsx` (register route)
- Edited: `src/pages/inspector/InspectorManagerInspections.tsx` + `InspectorManagerSupervisors.tsx` (scope by assignments)

### Out of scope
- Changes to existing supervisor invitation flow
- Changes to inspector portal layouts/sidebar (already supports `is_manager`)
- Public signup for inspectors (invitation-only, by design)

