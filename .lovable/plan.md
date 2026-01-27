

## Implementation Plan: Application Tracker, Admin Application Management, and Real Data Integration

This plan addresses three key requirements:
1. A visual "In-Process Application Tracker" on the client dashboard
2. Admin portal ability to view and update individual applications
3. Replace static/fake data with real database data

---

## Issue 1: Application Tracker Widget

### Current State
The dashboard currently shows applications in a list format with basic status badges. You want a visual step-by-step tracker showing where each application is in the certification process.

### Solution
Add a new "Application Tracker" component that displays the certification workflow as a visual progress tracker:

```text
+-------------------------------------------------------------------+
| APPLICATION TRACKER                                               |
+-------------------------------------------------------------------+
|                                                                   |
|  APP-1769524425600 - Full Certification                           |
|  Global Foods Co.                                                 |
|                                                                   |
|  [STEP INDICATOR - Visual Progress]                               |
|                                                                   |
|  (1)-------(2)-------(3)-------(4)-------(5)-------(6)           |
|  Draft   Submitted  Review  Inspection  Decision  Approved       |
|           [ACTIVE]                                                |
|                                                                   |
|  Status: Submitted on 27 Jan 2026                                |
|  Next Step: Awaiting officer review                              |
|                                                                   |
+-------------------------------------------------------------------+
```

### Steps in the Tracker
1. **Draft** - Application created but not submitted
2. **Submitted** - Application submitted for review
3. **Under Review** - Officer reviewing the application
4. **Inspection** - Awaiting or undergoing inspection
5. **Decision** - Pending final certification decision
6. **Approved/Rejected** - Final status

**File to create:**
- `src/components/ApplicationTracker.tsx`

**File to update:**
- `src/pages/client/ClientDashboard.tsx` - Replace "Ongoing Applications" section with the new tracker

---

## Issue 2: Admin Application Detail Page

### Current State
The admin portal has an Applications list (`/admin/applications`) that links to `/admin/applications/:id`, but this page doesn't exist (returns 404).

### Solution
Create a comprehensive Application Detail page where admins can:
- View all application details
- Update application status
- Assign officers
- View/add notes
- See status history
- Schedule inspections
- Record decisions

**Files to create:**
- `src/admin/pages/ApplicationDetail.tsx`

**Files to update:**
- `src/App.tsx` - Add route for `/admin/applications/:id`

### Application Detail Page Features

```text
+-------------------------------------------------------------------+
| APPLICATION DETAIL                                                |
+-------------------------------------------------------------------+
|                                                                   |
| APP-1769524425600                           [← Back to List]     |
| Organization: Global Foods Co.                                    |
| Submitted: 27 Jan 2026                                           |
|                                                                   |
+-------------------------------------------------------------------+
| [APPLICATION INFO]  [STATUS UPDATE]  [HISTORY]  [DOCUMENTS]      |
+-------------------------------------------------------------------+
|                                                                   |
| Current Status: [SUBMITTED ▼]                                    |
|                                                                   |
| Status Options:                                                   |
| - Under Review                                                    |
| - Awaiting Inspection                                            |
| - Inspection Complete                                            |
| - Pending Decision                                               |
| - Approved / Rejected                                            |
|                                                                   |
| Notes/Reason: [_______________________]                          |
|                                                                   |
| [Update Status]                                                   |
|                                                                   |
+-------------------------------------------------------------------+
```

---

## Issue 3: Replace Static Data with Real Database Queries

### Current Static Data Identified

| Location | Static Data | Fix |
|----------|-------------|-----|
| Welcome Header | "Marhaban, African Halal" | Fetch user's organization name |
| Urgent Alerts | Hardcoded document expiry + NCN alerts | Fetch from `application_documents` + `non_conformance_notices` |
| Compliance Snapshot | Hardcoded "Process Flow Diagrams", "Ingredient Manifest" etc. | Fetch real documents from `application_documents` with their verification status |

### Data Sources

**Welcome Header:**
```sql
-- Fetch user's profile and organization
SELECT p.full_name, o.name as organization_name 
FROM profiles p 
LEFT JOIN organizations o ON p.organization_id = o.id 
WHERE p.id = auth.uid()
```

**Urgent Alerts:**
```sql
-- Documents expiring within 30 days
SELECT * FROM application_documents 
WHERE expiry_date <= NOW() + INTERVAL '30 days'
  AND application_id IN (SELECT id FROM certification_applications WHERE organization_id = ...)

-- Open NCNs requiring action  
SELECT * FROM non_conformance_notices
WHERE status = 'open'
  AND application_id IN (SELECT id FROM certification_applications WHERE organization_id = ...)
```

**Compliance Snapshot:**
```sql
-- Recent documents with their status
SELECT document_type, file_name, created_at, status 
FROM application_documents 
WHERE application_id IN (...)
ORDER BY created_at DESC 
LIMIT 5
```

---

## Technical Implementation Details

### File Changes Summary

| File | Change |
|------|--------|
| `src/components/ApplicationTracker.tsx` | **NEW** - Visual step tracker component |
| `src/admin/pages/ApplicationDetail.tsx` | **NEW** - Admin application detail/edit page |
| `src/App.tsx` | Add route for `/admin/applications/:id` |
| `src/pages/client/ClientDashboard.tsx` | Replace static data with real queries, add tracker |

### Database Changes
No schema changes required. The existing tables support all needed queries:
- `certification_applications` - Application data
- `application_status_history` - Status change tracking (for audit)
- `organizations` - Organization details
- `profiles` - User profile and organization link
- `application_documents` - Uploaded documents
- `non_conformance_notices` - NCNs for alerts

### Status Update Flow (Admin)

When an admin updates an application status:

1. Update `certification_applications.status`
2. Insert record into `application_status_history` for audit trail
3. Create audit log entry

This ensures:
- Client dashboard reflects the new status
- Full audit trail of all status changes
- Proper authorization checks via RLS

---

## UI/UX Details

### Application Tracker Component

The tracker will display:
- Current step highlighted with primary color
- Completed steps with checkmarks
- Future steps in muted/outline style
- Current status description with timestamp
- "Next Step" guidance text

### Admin Application Detail

Organized with tabs:
1. **Overview** - Application details, organization info, scope
2. **Status** - Current status, update controls, reason field
3. **History** - Timeline of all status changes
4. **Documents** - Uploaded files linked to this application
5. **Inspections** - Linked inspections (if any)
6. **Decisions** - Certification decisions made

---

## Testing Checklist

After implementation, verify:

1. **Client Dashboard:**
   - Application tracker shows correct step for each application
   - Organization name displays in welcome header
   - Alerts section shows real data (or empty state if none)
   - Compliance snapshot shows real documents

2. **Admin Application Detail:**
   - Navigate from applications list to detail page
   - View complete application information
   - Update status and see it reflected
   - Status history records the change
   - Client dashboard reflects the new status

