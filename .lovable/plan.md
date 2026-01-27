

## Fix: Compliance & Inspections Page - Column Not Found Error

### Problem Identified
The error "Column corrective_actions.created_at does not exist" occurs because:

1. **Wrong column name**: The code orders by `created_at` but the table uses `submitted_at`
2. **Missing data joins**: The UI expects fields (`description`, `required_action`, `due_date`, `severity`) that exist on the linked `non_conformance_notices` table, not on `corrective_actions`

### Corrective Actions Table Structure
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `ncn_id` | uuid | Links to `non_conformance_notices` |
| `status` | enum | `pending`, `completed`, etc. |
| `response` | text | Client's response |
| `evidence_files` | array | Uploaded evidence |
| `submitted_at` | timestamp | **Use this instead of `created_at`** |
| `submitted_by` | uuid | Who submitted |
| `reviewed_at` | timestamp | When reviewed |
| `reviewed_by` | uuid | Who reviewed |
| `review_notes` | text | Reviewer notes |

### Non-Conformance Notices Table (linked data)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `ncn_number` | text | Display ID |
| `description` | text | Issue description |
| `category` | text | Issue category |
| `severity` | enum | `major`, `minor`, `critical` |
| `due_date` | date | When action is due |
| `status` | text | `open`, `closed` |

---

## Solution

### File to Update
`src/pages/client/ComplianceCenter.tsx`

### Changes Required

**1. Fix the order column** (line 72):
```typescript
// Before
.order('created_at', { ascending: false });

// After
.order('submitted_at', { ascending: false });
```

**2. Join with `non_conformance_notices` to get display data**:
```typescript
// Before
const { data: cars, error: carError } = await supabase
    .from('corrective_actions')
    .select('*')
    .order('created_at', { ascending: false });

// After
const { data: cars, error: carError } = await supabase
    .from('corrective_actions')
    .select(`
        *,
        ncn:non_conformance_notices(
            ncn_number,
            description,
            category,
            severity,
            due_date,
            status
        )
    `)
    .order('submitted_at', { ascending: false });
```

**3. Update the UI to reference the nested NCN data**:
```typescript
// Before
car.description
car.severity
car.due_date

// After
car.ncn?.description
car.ncn?.severity
car.ncn?.due_date
```

---

## Technical Summary

| Line | Current Code | Fixed Code |
|------|-------------|------------|
| 72 | `.order('created_at', ...)` | `.order('submitted_at', ...)` |
| 69-72 | `select('*')` | `select('*, ncn:non_conformance_notices(...)')` |
| 187 | `car.severity` | `car.ncn?.severity` |
| 198 | `car.description` | `car.ncn?.description` |
| 213 | `car.due_date` | `car.ncn?.due_date` |
| 196 | `car.id.split('-')[0]` | `car.ncn?.ncn_number` |

---

## Testing Checklist

After implementation, verify:
1. Page loads without errors
2. Corrective actions display with proper NCN data (description, severity, due date)
3. Status badges show correctly
4. Progress calculation works with the `status` field
5. Empty state shows when no corrective actions exist

