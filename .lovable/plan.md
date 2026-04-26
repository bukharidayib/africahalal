## Goals

1. Introduce a new application status **`pending_approval`** and use it across both portals.
2. Make the **Pending Approvals** admin module fetch applications with this new status (in addition to existing approval requests).
3. **Remove "Pending Pricing"** tab from the Accountant module in admin Billing.
4. Stop the system from auto-creating invoices/quotations when a client submits an application.
5. Improve the **Support Center** (client + admin) — add live "typing" indicators, read receipts, presence, and small UX polish.
6. Make the **Ingredient Tracker** module work smoothly across admin / supervisor portals (loading states, empty states, filters, AI re-run, real-time refresh).

---

## 1. Database changes (migration)

- `ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'pending_approval';`
- Add a new table `chat_typing_indicators` (session_id, user_id, sender_type, updated_at) with RLS:
  - select: session participants + admins
  - upsert: own rows only
- Enable Supabase Realtime on `chat_messages`, `chat_sessions`, `chat_typing_indicators`.
- (Optional) Add `last_read_at` columns on `chat_sessions` for client + admin to drive read receipts.

No changes to invoice/quotation tables — we only stop auto-creation on the client side.

---

## 2. Application status: `pending_approval`

**Where it fits in the lifecycle**
```text
draft → submitted → under_review → awaiting_inspection → inspection_complete
       → pending_approval → approved / rejected
```

**Admin portal (`src/admin/pages/ApplicationDetail.tsx`, `Applications.tsx`)**
- Add `pending_approval` to status dropdowns, badges, color map, and filters.
- When an officer recommends/forwards an application for final approval, set status to `pending_approval` (in addition to creating the `approval_requests` row).

**Client portal (`src/pages/client/MyApplications.tsx`, `ClientApplicationDetail.tsx`, `ApplicationTracker.tsx`, `ApplicationTimeline.tsx`)**
- Add label "Pending Approval" with amber/indigo badge.
- Show the new step in the progress tracker between "Inspection complete" and "Approved".

**Edge function `send-status-notification`**
- Add a friendly subject/body template for `pending_approval`.

---

## 3. Pending Approvals module (`src/admin/pages/PendingApprovals.tsx`)

Currently lists only `approval_requests`. Update so the page has two sections (or unified list):

- **Applications awaiting approval** — query `certification_applications` where `status = 'pending_approval'`, joined with org/recommender info.
- **Pending recommendations** — existing `approval_requests` query (kept for dual-control workflow).

Allow approve/reject from either source. Approving the application updates `certification_applications.status` to `approved` (and creates the certificate via existing flow). Rejecting sets it to `rejected`.

Add badge/count in `AdminSidebar` next to "Pending Approvals" using a realtime subscription.

---

## 4. Remove Pending Pricing + auto-invoice on submit

- `src/admin/pages/AdminBilling.tsx`: remove the `PendingPricingTab` import, its `<TabsTrigger>` and `<TabsContent>`. Re-balance the tab grid.
- Delete `src/admin/components/accountant/PendingPricingTab.tsx`.
- `src/pages/client/CertificationApplication.tsx`:
  - Remove any code that creates an invoice / quotation / pending-pricing row at submit time.
  - Update success dialog copy: remove the "Accountant team will email you a quotation/invoice" sentence; replace with "Our team will review your application and contact you with next steps."
- Search for any other call sites that auto-insert into `invoices` / `quotations` on submission and remove them.

(Manual invoice/quotation creation from the admin side stays untouched.)

---

## 5. Support Center improvements (both portals)

Files: `src/pages/client/SupportCenter.tsx`, `SupportChat.tsx`, `SupportTicketDetail.tsx`, plus `src/admin/pages/AdminSupportChatSession.tsx`, `AdminSupportChats.tsx`, `AdminSupportTicketDetail.tsx`.

Enhancements:
- **Typing indicator**: upsert into `chat_typing_indicators` on input change (debounced 600ms, expires after 3s); subscribe via realtime; show "Agent is typing…" / "Client is typing…" bubble.
- **Realtime new-message updates**: subscribe to `chat_messages` inserts for the active session and ticket replies.
- **Read receipts**: write `last_read_at` on session open; show double-tick when peer's `last_read_at >= message.created_at`.
- **Composer polish**: auto-grow textarea, Enter to send / Shift+Enter newline, attachment-ready layout (no backend change), emoji shortcut menu using existing UI.
- **Session list**: live unread badge on `AdminSupportChats` and `SupportCenter` recent tickets; relative timestamps using `date-fns`.
- **Empty/loading states**: skeleton bubbles; "No messages yet" illustration.
- **Quick actions**: ticket status badges with one-click "Mark resolved" for admins.

---

## 6. Ingredient Tracker polish

**Admin** (`src/admin/pages/IngredientTracker.tsx`)
- Add search by product / brand / org and filter by halal class summary.
- Show counts (halal / haram / unknown) per collection in the table.
- Show AI status pill (`pending`, `analyzing`, `analyzed`, `flagged`) and disable "Analyze" button while running with spinner.
- Add "Re-run analysis" and "Export PDF" actions.
- Realtime refresh when supervisor adds new collections.
- Replace `as any` casts where types now exist; keep where needed.

**Supervisor** (`src/pages/supervisor/SupervisorIngredients.tsx`, `SupervisorIngredientForm.tsx`)
- Loading skeletons + empty state CTA.
- Validate ingredient form (required name, source).
- Show success toast and redirect after save.
- After save, optimistic insert into list view.

**Client** (read-only view of own products' ingredient analysis on `ComplianceCenter.tsx` if collection exists for their org) — surface a small "Ingredient compliance" card with the last analysis result.

---

## Files to add / modify

**New**
- `supabase/migrations/<timestamp>_pending_approval_and_chat_typing.sql`
- `src/components/support/TypingIndicator.tsx`
- `src/hooks/useTypingIndicator.ts`
- `src/hooks/useRealtimeChat.ts`

**Modified**
- `src/admin/pages/ApplicationDetail.tsx`, `Applications.tsx`, `PendingApprovals.tsx`, `AdminBilling.tsx`, `IngredientTracker.tsx`, `AdminSupportChatSession.tsx`, `AdminSupportChats.tsx`, `AdminSupportTicketDetail.tsx`
- `src/admin/components/layout/AdminSidebar.tsx` (badge count)
- `src/pages/client/CertificationApplication.tsx`, `MyApplications.tsx`, `ClientApplicationDetail.tsx`, `SupportCenter.tsx`, `SupportChat.tsx`, `SupportTicketDetail.tsx`, `ComplianceCenter.tsx`
- `src/components/ApplicationTracker.tsx`, `src/components/application/ApplicationTimeline.tsx`
- `src/pages/supervisor/SupervisorIngredients.tsx`, `SupervisorIngredientForm.tsx`
- `supabase/functions/send-status-notification/index.ts`

**Deleted**
- `src/admin/components/accountant/PendingPricingTab.tsx`

---

## Notes / risks

- Adding an enum value requires the migration to commit before any code can write `'pending_approval'` — handled by running the migration first.
- The auto-invoice removal is a behavioural change: existing draft invoices already in DB are untouched; only future submissions stop creating them.
- Typing/presence relies on Supabase Realtime being enabled on the new table; the migration takes care of that via `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.
