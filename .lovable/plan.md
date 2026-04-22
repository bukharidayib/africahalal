` is needed. I'll answer directly.

# How the NCN (Non-Conformance Notice) Feature Works

NCN is the **enforcement backbone** of AHI. It's how the certification body formally records that a client/site has failed to meet a halal compliance requirement, demands a fix, and tracks resolution. It's the audit trail that makes certification credible.

There are actually **two related but distinct concepts** in the codebase — important to understand the difference:

| Concept | Table | Issued by | Scope |
|---|---|---|---|
| **NCN** (Non-Conformance Notice) | `non_conformance_notices` | **Admin / Officer** (Enforcement portal) | Tied to a **certification application** — formal regulatory action |
| **NCR** (Non-Conformance Report) | `inspector_ncrs` / `supervisor_ncrs` | **Inspector / Supervisor** | Tied to a **site inspection** — operational finding raised in the field |

NCRs are field-level findings; an NCN is the formal notice the certification body issues (often escalated from an NCR or from a failed inspection report).

---

## Lifecycle (status flow)

```text
        [Inspector/Supervisor finds issue]
                       │
                       ▼
                  NCR raised  ──────► (Stays in field portals)
                       │
                       ▼ (escalated / officer review)
              ┌──────────────────┐
              │   NCN: open      │  ← Admin issues via Enforcement page
              └──────────────────┘
                       │ Client uploads response + evidence
                       ▼
       ┌─────────────────────────────────┐
       │ Corrective Action: pending      │
       │  → under_review                 │
       └─────────────────────────────────┘
              │                    │
       accepted                rejected
              │                    │
              ▼                    ▼
       NCN: closed          NCN stays open
                            (client must resubmit)
```

Severities: `minor` · `major` · `critical`. Default due date is **+14 days**.

---

## Workflow per portal

### 1. Admin Portal (`/admin/enforcement` — `Enforcement.tsx`)
The control center. Permission gate: `enforcement.manage`.

- **Issue NCN dialog**: pick an application (only ones in `submitted` → `pending_decision`), choose category (Documentation Deficiency, Process Non-Compliance, Ingredient Verification, Facility Standards, Record Keeping, Supplier Compliance, Other), severity, description, due date.
- NCN number generated server-side via `generate_ncn_number()` RPC (format `NCN-YYYY-XXXXX`).
- Logged to `audit_logs` with action `ncn_issued`.
- **Two tabs**: "Non-Conformance Notices" and "Corrective Actions".
- **Review corrective actions**: officer reads client's response + evidence, then `accept` (auto-closes the NCN) or `reject` (NCN stays open, client must resubmit).
- Stats cards: Open · Overdue · Pending Review · Resolved.

### 2. Client Portal (`/client/compliance` — `ComplianceCenter.tsx` + `ClientDashboard.tsx`)
Read + respond. No power to close anything.

- **Dashboard alerts**: open NCNs surface as critical/warning banners on `ClientDashboard`.
- **Compliance Center**: lists all corrective actions tied to their NCNs with severity badge, NCN number, description, status.
- **Submit corrective action**: writes to `corrective_actions` (response text + `evidence_files` array uploaded to storage). RLS guarantees they only see NCNs for their own organization (`profiles.organization_id` join).
- Cannot edit, escalate, or close — only respond.

### 3. Supervisor Portal (`/supervisor/ncrs` — `SupervisorNCRs.tsx`)
Site-level view. Reads from `supervisor_ncrs` (NCRs, **not** NCNs).

- Auto-created when a supervisor submits a daily report and the system detects major non-compliance (compliance score thresholds).
- Statuses: `open` → `corrective_action_submitted` → `under_review` → `closed` / `escalated`.
- Supervisor can mark internal corrective actions; if unresolved or critical, it gets **escalated** → admin then issues a formal NCN.
- Dashboard widget shows pending NCR count + overdue badge.

### 4. Inspector Portal (`/inspector/ncrs` — `InspectorNCRs.tsx`)
Mirror of supervisor view but for the inspector's own inspection reports.

- Reads from `inspector_ncrs` — created automatically when an inspection report's findings include `major` or `critical` non-compliance.
- Inspector cannot create NCRs manually from this list (they're system-generated from reports). They view, attach evidence, and track due dates.
- Same status flow as supervisor NCRs; escalation feeds back to admin.

---

## Key data plumbing
- `non_conformance_notices` ← issued by admins, joined to `certification_applications` → `organizations`.
- `corrective_actions` ← client responses, joined to `non_conformance_notices` (1-to-many; client may submit multiple attempts until accepted).
- RLS isolates clients to their org, supervisors to assigned sites, inspectors to assigned inspections, and admins by `enforcement.manage` permission.
- All issuances + reviews write to `audit_logs` (`ncn_issued`, `corrective_action_accepted`, `corrective_action_rejected`) — this is the dual-control evidence trail.

---

## Where the gaps are (worth knowing)
1. **NCR → NCN escalation is manual today.** A supervisor/inspector NCR doesn't auto-create an admin NCN; an officer reads the report and re-issues from `Enforcement.tsx`.
2. **Closing an NCN doesn't auto-update the parent application status** — the officer must separately move the application forward.
3. **No notification email** is sent to the client when an NCN is issued (only an in-app alert on the dashboard).

If you'd like me to plan an enhancement to any of these (auto-escalation, email notifications, or auto application-status sync on NCN closure), say the word and I'll draft a plan.That was an accidental tool call — ignore. Here is the answer directly:

# How the NCN (Non-Conformance Notice) Feature Works

NCN is the **enforcement backbone** of AHI. It's how the certification body formally records that a client/site has failed a halal compliance requirement, demands a fix, and tracks resolution.

There are **two related but distinct concepts** in the codebase:

| Concept | Table | Issued by | Scope |
|---|---|---|---|
| **NCN** (Non-Conformance Notice) | `non_conformance_notices` | **Admin / Officer** | Tied to a **certification application** — formal regulatory action |
| **NCR** (Non-Conformance Report) | `inspector_ncrs` / `supervisor_ncrs` | **Inspector / Supervisor** | Tied to a **site inspection** — operational field finding |

NCRs are field-level findings; an NCN is the formal notice the certification body issues (often escalated from an NCR or a failed inspection report).

---

## Lifecycle

```text
   [Inspector/Supervisor finds issue in field]
                  │
                  ▼
              NCR raised  (lives in inspector/supervisor portals)
                  │  (escalated / officer review)
                  ▼
        ┌────────────────────┐
        │   NCN: open        │  ← Admin issues via Enforcement page
        └────────────────────┘
                  │  Client uploads response + evidence
                  ▼
        ┌─────────────────────────────────┐
        │ Corrective Action: pending      │
        │   → under_review                │
        └─────────────────────────────────┘
              │                    │
          accepted              rejected
              │                    │
              ▼                    ▼
        NCN: closed         NCN stays open
                            (client must resubmit)
```

Severities: `minor` · `major` · `critical`. Default due date = +14 days.

---

## Workflow per portal

### 1. Admin Portal — `/admin/enforcement` (`Enforcement.tsx`)
The control center. Permission gate: `enforcement.manage`.
- **Issue NCN dialog**: pick application (only `submitted` → `pending_decision`), category (Documentation Deficiency, Process Non-Compliance, Ingredient Verification, Facility Standards, Record Keeping, Supplier Compliance, Other), severity, description, due date.
- NCN number generated by `generate_ncn_number()` RPC → `NCN-YYYY-XXXXX`.
- Audit-logged (`ncn_issued`).
- Two tabs: **Non-Conformance Notices** + **Corrective Actions**.
- **Review corrective actions**: officer reads response & evidence → `accept` (auto-closes NCN) or `reject` (NCN stays open).
- Stats: Open · Overdue · Pending Review · Resolved.

### 2. Client Portal — `/client/compliance` (`ComplianceCenter.tsx` + `ClientDashboard.tsx`)
Read + respond only.
- **Dashboard alerts**: open NCNs surface as critical/warning banners.
- **Compliance Center**: lists corrective actions with NCN number, severity badge, description, status.
- **Submit corrective action**: writes to `corrective_actions` (response text + `evidence_files` uploaded to storage).
- RLS restricts to their own organization via `profiles.organization_id`.
- Cannot edit, escalate, or close — only respond.

### 3. Supervisor Portal — `/supervisor/ncrs` (`SupervisorNCRs.tsx`)
Reads `supervisor_ncrs` (NCRs, **not** NCNs).
- Auto-created when a daily report's compliance score crosses major-non-compliance thresholds.
- Statuses: `open` → `corrective_action_submitted` → `under_review` → `closed` / `escalated`.
- Supervisor records site-level corrective actions; if unresolved or critical, status → `escalated` → admin then issues a formal NCN.
- Dashboard widget shows pending NCR count and overdue.

### 4. Inspector Portal — `/inspector/ncrs` (`InspectorNCRs.tsx`)
Mirror of supervisor view, against `inspector_ncrs`.
- System-generated when an inspection report's findings flag `major`/`critical` non-compliance — inspectors do not create them manually from this list.
- Inspector views, attaches evidence, tracks due dates.
- Same status flow; escalation routes back to admin for formal NCN issuance.

---

## Key data plumbing
- `non_conformance_notices` → joined to `certification_applications` → `organizations`.
- `corrective_actions` → 1-to-many under an NCN (client can submit multiple attempts until accepted).
- RLS isolates: clients to their org, supervisors to assigned sites, inspectors to assigned inspections, admins via `enforcement.manage`.
- All issuances + reviews write to `audit_logs` (`ncn_issued`, `corrective_action_accepted`, `corrective_action_rejected`) — the dual-control evidence trail.

---

## Known gaps (worth knowing)
1. **NCR → NCN escalation is manual.** A field NCR does not auto-create an admin NCN; an officer must re-issue from `Enforcement.tsx`.
2. **Closing an NCN does not auto-advance the parent application status** — officer must move the application forward separately.
3. **No email** is sent to the client when an NCN is issued (only an in-app dashboard alert).

If you want me to plan an enhancement (auto-escalation NCR→NCN, email notifications on issuance, or auto application-status sync on NCN closure), tell me which and I'll draft a plan.