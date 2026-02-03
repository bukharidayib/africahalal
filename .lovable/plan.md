

## Fix: Admin Portal Infinite Loading & React Hook Errors

### Root Cause Analysis

The admin portal pages are experiencing infinite loading and `TypeError: Cannot read properties of null (reading 'useState')` errors due to two interconnected issues:

1. **Missing React Default Import**: 18+ admin files use named imports like `import { useState } from 'react'` without the default `import React` - this causes bundling issues where hooks can't access the React instance properly

2. **Missing Vite Dedupe Configuration**: The Vite bundler may create separate React instances, causing hooks to fail silently

3. **Unhandled Auth Refresh Token Error**: The console shows `AuthApiError: Invalid Refresh Token` which causes the auth check to hang indefinitely instead of gracefully redirecting to login

---

### Files Requiring React Import Fix

All these files need `import React` added to their existing React imports:

| File | Current Import |
|------|---------------|
| `src/admin/pages/AdminDashboard.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/pages/AdminSettings.tsx` | `import { useState } from 'react'` |
| `src/admin/pages/AdminSupportCenter.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/pages/AdminSupportChats.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/pages/AdminSupportChatSession.tsx` | `import { useEffect, useState, useRef } from 'react'` |
| `src/admin/pages/AdminSupportTicketDetail.tsx` | `import { useEffect, useState, useRef } from 'react'` |
| `src/admin/pages/AdminSupportTickets.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/pages/ApplicationDetail.tsx` | `import { useState, useEffect } from 'react'` |
| `src/admin/pages/Applications.tsx` | `import { useState, useEffect } from 'react'` |
| `src/admin/pages/AuditLogs.tsx` | `import { useState, useEffect } from 'react'` |
| `src/admin/pages/Certificates.tsx` | `import { useState, useEffect } from 'react'` |
| `src/admin/pages/PendingApprovals.tsx` | `import { useState, useEffect } from 'react'` |
| `src/admin/pages/RoleEditor.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/pages/RolesPermissions.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/pages/UserManagement.tsx` | `import { useState, useEffect } from 'react'` |
| `src/admin/components/layout/AdminLayout.tsx` | `import { ReactNode } from 'react'` |
| `src/admin/components/ActivityFeed.tsx` | `import { useEffect, useState } from 'react'` |
| `src/admin/components/SupportQueue.tsx` | `import { useEffect, useState } from 'react'` |

---

### Implementation Plan

#### Step 1: Update Vite Configuration

Add React deduplication to prevent multiple React instances:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent duplicate React instances
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
```

#### Step 2: Fix Auth Hook Error Handling

Update `useAdminAuth.ts` to handle refresh token errors gracefully:

```typescript
// In checkAdminAuth function, handle the refresh token error
const checkAdminAuth = useCallback(async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      // Handle refresh token errors gracefully - treat as not authenticated
      if (sessionError.message?.includes('Refresh Token')) {
        console.warn('Session expired, clearing auth state');
        await supabase.auth.signOut();
      }
      // Set not authenticated state instead of throwing
      setState({
        user: null,
        session: null,
        role: null,
        permissions: getPermissions(null),
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      return;
    }
    // ... rest of the function
  } catch (err) {
    // ... error handling
  }
}, [fetchUserRole]);
```

#### Step 3: Add React Import to All Admin Files

Each file gets updated from:
```typescript
import { useState, useEffect } from 'react';
```

To:
```typescript
import React, { useState, useEffect } from 'react';
```

---

### Technical Details

#### Why This Fix Works

1. **React Import**: Adding `import React` ensures all React functions (hooks, createElement, etc.) are accessed from the same module instance, preventing the null reference error

2. **Vite Dedupe**: Forces Vite to resolve React packages to a single location, preventing duplicate instances when third-party libraries bundle their own React

3. **Auth Error Handling**: The refresh token error was causing `getSession()` to throw, but the error wasn't being caught properly, leaving `isLoading: true` forever

#### Files Changed Summary

| Category | Files | Changes |
|----------|-------|---------|
| Config | 1 | Add dedupe to vite.config.ts |
| Auth | 1 | Fix error handling in useAdminAuth.ts |
| Admin Pages | 15 | Add React import |
| Admin Components | 3 | Add React import |
| **Total** | **20 files** | |

---

### Testing Checklist

After implementation:

1. Navigate to `/admin/login` - should load without errors
2. Clear browser localStorage and try again
3. Navigate to `/admin/certificates` - should load correctly
4. Navigate to `/admin/dashboard` - all stats should display
5. Test login flow with valid credentials
6. Test that session expiration redirects to login gracefully

