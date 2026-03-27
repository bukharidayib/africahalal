

# Inspection Email Notifications + Client Inspections View + Payment After Submission

## Three Features

### 1. Email Notifications on Inspection Scheduling

**Current state**: `handleScheduleInspection()` in `src/admin/pages/Inspections.tsx` inserts the inspection and updates application status, but does NOT send emails. The `send-inspection-notification` edge function exists and already sends emails via Resend -- it just needs to be called.

**Changes**:

**File: `src/admin/pages/Inspections.tsx`** (lines ~231-253)
- After successful inspection insert, call `supabase.functions.invoke('send-inspection-notification')` with:
  - `type: "inspection_scheduled"`
  - `title: "Inspection Scheduled"`
  - `message`: include date, time, organization name
  - `user_ids`: array containing the inspector's `user_id` AND the client org owner's user ID
- To get the client user ID: query `profiles` where `organization_id` matches the application's `organization_id`
- To get the inspector's user ID: query `inspectors` table using `scheduleForm.inspector_id`

### 2. Client Portal — Scheduled Inspections Page

**Current state**: The "Inspections" sidebar link points to `/client/inspections` which loads `ComplianceCenter.tsx` — this shows compliance/CAR data, NOT scheduled inspections.

**Changes**:

**New file: `src/pages/client/ClientInspections.tsx`**
- Query `inspections` table joined with `certification_applications` (filtered by the client's `organization_id`)
- Show a table/card list of scheduled inspections with: date, time, status, application number
- Include status badges (scheduled, in_progress, completed)
- Empty state: "No inspections scheduled yet"

**File: `src/App.tsx`**
- Add new route `/client/inspections/scheduled` pointing to `ClientInspections`
- Keep existing `/client/inspections` for ComplianceCenter

**File: `src/components/layout/ClientSidebar.tsx`**
- Update "Inspections" nav item or add sub-item for "Scheduled Inspections"

**Database**: Add RLS policy for clients to SELECT from `inspections` via their organization's applications (if not already covered). Check: the existing RLS on `inspections` only allows admin and inspector access — need to add a client SELECT policy.

**Migration**:
```sql
CREATE POLICY "Clients can view own inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT ca.id FROM certification_applications ca
    JOIN profiles p ON p.organization_id = ca.organization_id
    WHERE p.id = auth.uid()
  )
);
```

### 3. Payment Prompt After Application Submission + Channel Selection

**Current state**: After submission, client is redirected to `/client/applications`. An invoice is created but there's no prompt to pay. The MoMo payment dialog exists but uses a hardcoded `channel` from env var.

**Changes**:

**File: `src/pages/client/CertificationApplication.tsx`**
- After successful submission (line ~639), instead of immediately navigating, show a success dialog with:
  - "Application submitted successfully"
  - "Pay your certification fee now" button → opens `MoMoPaymentDialog`
  - "Pay later" link → navigates to `/client/applications`
- Pass the newly created invoice ID to the payment dialog

**File: `src/components/billing/MoMoPaymentDialog.tsx`**
- Add a "Payment Provider" select field with options: Airtel, MTN, Zamtel
- Pass selected channel to the edge function

**File: `supabase/functions/process-momo-payment/index.ts`**
- Accept `channel` parameter from request body (instead of env var)
- Use the client-selected channel ("airtel", "mtn", "zamtel") in the ZynlePay payload
- Fallback to "momo" if not provided

## Implementation Order

1. Database migration — add client inspection RLS policy
2. Update `process-momo-payment` edge function — accept `channel` param
3. Update `MoMoPaymentDialog` — add provider selector (Airtel/MTN/Zamtel)
4. Update `Inspections.tsx` — send email after scheduling
5. Create `ClientInspections.tsx` — client inspection view
6. Update `App.tsx` + `ClientSidebar.tsx` — route and nav
7. Update `CertificationApplication.tsx` — payment prompt after submission

