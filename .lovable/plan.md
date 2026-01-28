
## Fix: useState Null Error on Admin Login Page

### Root Cause
The error `Cannot read properties of null (reading 'useState')` is a React bundling issue where hooks can't access the React instance properly. This happens when:
1. Named imports like `{ useState }` are used without the default `React` import
2. The Vite bundler creates separate React instances

### Files That Need Fixing

| File | Current Import | Required Fix |
|------|---------------|--------------|
| `src/admin/pages/AdminLogin.tsx` | `import { useState } from 'react';` | Add `import React` |
| `src/admin/hooks/useAdminAuth.ts` | `import { useState, useEffect, useCallback } from 'react';` | Add `import React` |
| `src/admin/contexts/AdminAuthContext.tsx` | Needs verification | Add `import React` if missing |

### Changes Required

**1. AdminLogin.tsx (line 1)**
```typescript
// Before
import { useState } from 'react';

// After
import React, { useState } from 'react';
```

**2. useAdminAuth.ts (line 1)**
```typescript
// Before
import { useState, useEffect, useCallback } from 'react';

// After
import React, { useState, useEffect, useCallback } from 'react';
```

**3. AdminAuthContext.tsx (line 1)**
```typescript
// Before
import { createContext, useContext, ReactNode } from 'react';

// After
import React, { createContext, useContext, ReactNode } from 'react';
```

### Why This Works
Adding `import React` ensures all React functions are accessed from the same module instance, preventing the null reference error with hooks.

### Testing
After these changes:
1. Navigate to `/admin/login`
2. Page should load without errors
3. Login form should be functional
