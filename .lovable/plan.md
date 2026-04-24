## Application Lifecycle Hardening — Single Active App, Chat, History & Timeline

Enforce one active application per business, add a per-application admin↔client chat, restrict the public Directory to current certificates, and surface application history + timeline in both portals.

### 1. Database changes (migration)

**a) Extend `application_status` enum**
Add value `'expired'` to the `application_status` enum. An application becomes `expired` when its issued certificate passes `expiry_date` (mirrors the existing `certificate_status.expired`).

**b) Validation trigger: one active application per organization**
Create `BEFORE INSERT` trigger on `certification_applications` that raises if any existing row for the same `organization_id` has status NOT IN (`expired`, `rejected`, `withdrawn`).

```sql
RAISE EXCEPTION 'You already have an active application. You can only create a new one after the current application expires.'
  USING ERRCODE = 'P0001';
```

This enforces the rule at the DB layer regardless of client.

**c) Auto-expire job (function only, called from edge cron-style invocation or on read)**
Create SQL function `public.expire_lapsed_applications()` (security definer) that:
- Finds applications with status `approved` whose certificate `expiry_date < CURRENT_DATE`
- Updates them to `expired` (status change is logged via existing `log_application_status_change` trigger)
- Marks the certificate `status = 'expired'`

**d) Reuse existing `application_messages` table for chat**
Already has `application_id, sent_by, message, message_type, sent_at`. Add column `sender_role text` (values: `client` | `admin`) for clear timeline rendering. RLS already allows clients to view own + admins to manage. Add INSERT policy for clients on their own org's applications (currently only admins can insert).

**e) Realtime**
Enable realtime on `application_messages` (`ALTER PUBLICATION supabase_realtime ADD TABLE application_messages`).

### 2. Backend logic — `CertificationApplication.tsx`

Pre-flight check before INSERT (defensive UX layer; trigger is the source of truth):
- Query `certification_applications` for the user's org where status NOT IN (`expired`,`rejected`,`withdrawn`)
- If found → block with toast and link to the existing application
- Backend trigger guarantees enforcement even if frontend is bypassed

Surface trigger error (`P0001`) into a friendly toast.

### 3. Application Chat component

New component: `src/components/application/ApplicationChat.tsx`
- Loads `application_messages` for given `application_id`, ordered by `sent_at`
- Realtime subscription on filter `application_id=eq.{id}`
- Bubble UI: client right-aligned, admin left-aligned; role badge + timestamp
- Textarea + Send button → INSERT with `sender_role` resolved from current user (admin if `is_admin_user`, else `client`)
- Reused by both `ClientApplicationDetail.tsx` and admin `ApplicationDetail.tsx` (added as a new "Chat" tab)

### 4. Application Timeline component

New component: `src/components/application/ApplicationTimeline.tsx`
- Joins `application_status_history` (status transitions) + `application_messages` (chat highlights, optional toggle) + `certification_decisions` (key admin actions) into a single chronological feed
- Vertical timeline with status pill, actor email/role, timestamp, optional reason
- Embedded as a "Timeline" tab in both client and admin application detail pages

### 5. Directory page (`src/pages/Directory.tsx`)

Filter the `certificates` query so each organization shows **only its current certificate**:
- Order by `issue_date DESC`, then dedupe by `organization_id` client-side keeping the first row
- Exclude `status = 'expired'` from the default view (the "Expired" filter still allows opt-in viewing)
- Auto-update certificate status to `expired` when `expiry_date < today` via the new SQL function (called best-effort via a lightweight edge function on directory load, or via scheduled cron)

### 6. My Applications + Admin Applications — History view

**Client `MyApplications.tsx`:**
- Split list into two sections:
  - **Current Application** (status NOT IN expired/rejected/withdrawn) — at most one
  - **Previous Applications** — collapsible section listing expired/rejected/withdrawn rows
- Add "expired" tab to the filter

**Admin `Applications.tsx`:**
- Add a "Per-Business" view toggle: groups applications by organization, shows current on top + an expandable "Previous applications" panel beneath
- Each previous row links to detail (timeline, chat, status history)

### 7. Application Detail tabs (both portals)

Add two tabs to the existing detail tab strip:
- **Chat** — `<ApplicationChat applicationId={id} />`
- **Timeline** — `<ApplicationTimeline applicationId={id} />`

### Files touched

- New migration: `supabase/migrations/<ts>_application_lifecycle.sql`
- New: `src/components/application/ApplicationChat.tsx`
- New: `src/components/application/ApplicationTimeline.tsx`
- Edited: `src/pages/client/CertificationApplication.tsx` (pre-flight + error mapping)
- Edited: `src/pages/client/MyApplications.tsx` (Current vs Previous sections)
- Edited: `src/pages/client/ClientApplicationDetail.tsx` (Chat + Timeline tabs)
- Edited: `src/admin/pages/Applications.tsx` (per-business grouping)
- Edited: `src/admin/pages/ApplicationDetail.tsx` (Chat + Timeline tabs)
- Edited: `src/pages/Directory.tsx` (one row per org, exclude expired by default)

### Out of scope
- Email notifications for new chat messages (existing `send-application-message` edge function can be wired later if desired)
- Rebuilding the supervisor/inspector chat — only the application-scoped client↔admin chat
