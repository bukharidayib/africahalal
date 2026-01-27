

## Fix Summary: Client Portal Light Mode, Zambian Cities, RLS, and Upload Functionality

This plan addresses four issues you've reported:
1. Light mode styling issues across the client portal
2. Changing "Operating Country" to a list of Zambian cities
3. Submit & Lock button failing due to organizations table RLS
4. Upload evidence functionality not working

---

## Issue 1: Light Mode Styling Problems

### Problem
The client portal has visibility issues in light mode because:
- The sidebar uses hardcoded dark theme colors (`bg-sidebar-background`, `text-sidebar-foreground`)
- The main content area uses `bg-slate-50/50` which doesn't respect theme variables
- Some text colors don't have enough contrast in light mode

### Solution
Update the CSS variables and component styles to properly support both themes:

**Files to update:**
- `src/index.css` - Add proper light mode sidebar variables
- `src/components/layout/ClientSidebar.tsx` - Update sidebar colors for light mode
- `src/components/layout/ClientLayout.tsx` - Change `bg-slate-50/50` to `bg-muted/50`

**Key changes:**
- Light mode sidebar will use a light background with dark text
- Navigation links will have proper contrast
- Logout button styling will be visible in both modes

---

## Issue 2: Change "Operating Country" to Zambian Cities

### Problem
The dropdown currently shows African countries, but you need it to show cities in Zambia.

### Solution
Replace the country options with a comprehensive list of Zambian cities (major cities and provincial capitals).

**File to update:**
- `src/pages/client/CertificationApplication.tsx`

**Changes:**
- Rename label from "Operating Country" to "Operating City (Zambia)"
- Replace country options with: Lusaka, Ndola, Kitwe, Kabwe, Chingola, Mufulira, Livingstone, Luanshya, Kasama, Chipata, Solwezi, Mongu, Mansa, Choma, and more

---

## Issue 3: Submit & Lock Button Failing (Organizations RLS)

### Problem
The current RLS policies on the `organizations` table only allow **admin users** to insert:
```sql
Admins can insert organizations: is_admin_user(auth.uid())
```

When a client submits an application, the code tries to create a new organization, but it fails because regular authenticated users cannot insert into this table.

### Solution
Add a new RLS policy that allows authenticated users to insert organizations for their own certification applications.

**Database migration required:**
```sql
-- Allow authenticated users to insert their own organization
CREATE POLICY "Users can create their own organization"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to view their own organization
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT TO authenticated
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
```

This allows:
- Any authenticated user to create an organization (for their business)
- Users to only view organizations they belong to
- Admins retain full access via existing policies

---

## Issue 4: Upload Evidence Not Working

### Problem
The document upload functionality has two issues:

1. **RLS Policy uses folder structure**: The storage RLS requires files to be in a folder named with the user's ID (`auth.uid()::text = storage.foldername(name)[1]`). This is already correctly implemented in `DocumentVault.tsx`.

2. **Application linking is broken**: The code tries to find an application where `organization_id = user.id`, which is incorrect. It should find applications for the user's actual organization.

### Solution
Fix the `DocumentVault.tsx` file to properly link uploaded documents to the user's applications.

**File to update:**
- `src/pages/client/DocumentVault.tsx`

**Changes:**
```typescript
// Current (incorrect):
.eq('organization_id', user.id)

// Fixed (correct):
// First get user's profile to find their organization_id
// Then find applications for that organization
```

---

## Technical Implementation Details

### Database Migration
A single migration will add the new RLS policies for organizations.

### File Changes Summary

| File | Change |
|------|--------|
| `src/index.css` | Add light mode sidebar CSS variables |
| `src/components/layout/ClientSidebar.tsx` | Update sidebar for theme-aware styling |
| `src/components/layout/ClientLayout.tsx` | Use theme variables instead of hardcoded colors |
| `src/pages/client/CertificationApplication.tsx` | Replace countries with Zambian cities |
| `src/pages/client/DocumentVault.tsx` | Fix application lookup for document upload |

### Zambian Cities List
The following cities will be included:
- **Copperbelt Province**: Ndola, Kitwe, Chingola, Mufulira, Luanshya, Kalulushi, Chililabombwe
- **Lusaka Province**: Lusaka, Chongwe, Kafue
- **Southern Province**: Livingstone, Choma, Mazabuka, Monze
- **Central Province**: Kabwe, Kapiri Mposhi, Mkushi
- **Eastern Province**: Chipata, Petauke, Katete
- **Northern Province**: Kasama, Mbala, Mpika
- **North-Western Province**: Solwezi, Mwinilunga
- **Western Province**: Mongu, Senanga
- **Luapula Province**: Mansa, Samfya
- **Muchinga Province**: Chinsali, Nakonde

---

## Testing Checklist

After implementation, verify:
1. Toggle between light and dark mode - all pages should be readable
2. Sidebar navigation is visible in both modes
3. City dropdown shows Zambian cities
4. Submit a test application - should complete successfully
5. Upload a document in the Document Vault - should store and display correctly

