# Fix Inspector Incident, Observation, and NCN Issues

Three separate issues, all root-caused. Fixing them requires database migrations + a small RLS/bucket setup. No frontend changes needed.

## Root Causes

1. **Inspector → Report Incident** fails with two errors:
   - `Could not find the table "public.inspector_incidents"` — the table was never created (only `supervisor_incidents` exists).
   - `Upload failed Bucket not Found` — the `Inspector-evidence` storage bucket referenced by the form does not exist (only `inspection-evidence` and `supervisor-evidence` exist).

2. **Inspector → New Observation** fails with `Could not find the table "public.inspector_observations"` — the table was never created (only `supervisor_observations` exists).

3. **Admin → Issue NCN** fails with `Failed to issue NCN`. The actual error from the RPC is `invalid input syntax for type integer: "026-00001"`. The `generate_ncn_number()` function uses `SUBSTRING(ncn_number FROM 11)` but the NCN format is `AHIS-NCN-YYYY-NNNNN` where the sequence starts at position **15**, not 11. The current function tries to cast `"026-00001"` to integer and crashes.

## Plan

### 1. Database migration — create `inspector_incidents` table
- Columns: `id`, `incident_number` (unique), `organization_id` (FK organizations), `incident_type`, `severity`, `description`, `immediate_action_taken`, `evidence_urls (text[])`, `reported_by` (FK auth.users), `status` (default 'open'), `created_at`, `updated_at`.
- Enable RLS.
- Policies:
  - Inspectors can `INSERT` their own (`reported_by = auth.uid()`).
  - Inspectors can `SELECT` their own.
  - Admins can `SELECT`/`UPDATE` all (using `is_admin_user`).
- Create RPC `generate_Inspector_incident_number()` returning `INC-INS-YYYY-NNNNN` (matches frontend call).
- Create RPC `log_Inspector_activity(...)` no-op-style insert into a small `inspector_activity_log` table (or reuse pattern from `log_supervisor_activity`).

### 2. Database migration — create `inspector_observations` table
- Columns: `id`, `organization_id` (FK), `tag`, `observation`, `recommendation` (nullable), `created_by` (FK auth.users), `created_at`, `updated_at`.
- Enable RLS.
- Policies:
  - Inspectors `INSERT`/`SELECT` own (`created_by = auth.uid()`).
  - Admins `SELECT` all.

### 3. Storage bucket — create `Inspector-evidence`
- Private bucket.
- Policies: authenticated users may upload to `${auth.uid()}/...` path; only owner (and admins) can read.

### 4. Fix `generate_ncn_number()` function
- Change `SUBSTRING(ncn_number FROM 11)` → `SUBSTRING(ncn_number FROM 15)` so it correctly parses `AHIS-NCN-YYYY-NNNNN` (prefix `AHIS-NCN-YYYY-` is 14 chars, sequence starts at position 15).
- Tighten the `LIKE` filter to `^AHIS-NCN-YYYY-[0-9]+$` to ignore any malformed legacy rows.

## Files

- New migration: creates 2 tables + 1 activity log table + RLS + 2 RPCs + bucket + bucket policies + replaces `generate_ncn_number()`.
- No frontend file changes — existing code in `InspectorIncidentForm.tsx`, `InspectorObservations.tsx`, and `Enforcement.tsx` already references these exact names.
