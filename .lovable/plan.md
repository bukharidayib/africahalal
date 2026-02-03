

## Fix: Admin Portal Infinite Loading & Immediate Redirect

### Problem Summary

The admin panel has these issues:
1. Pages load forever (infinite loading spinner)
2. When logging out, users aren't redirected immediately
3. Unauthenticated users aren't redirected to login quickly

---

### Root Cause Analysis

| Issue | Current Behavior | Expected Behavior |
|-------|-----------------|-------------------|
| Initial load | `checkAdminAuth` and `onAuthStateChange` both run simultaneously, creating race conditions | Initial load should complete first, then listener handles future changes |
| Safety timeout | None - if auth check hangs, loading spinner shows forever | Should timeout after 5 seconds and show login page |
| Sign-out | Waits for async operations before redirecting | Should redirect immediately and clean up in background |
| Session errors | Some errors may not properly set `isLoading: false` | All error paths must set `isLoading: false` |

---

### Implementation Plan

#### 1. Rewrite `useAdminAuth.ts` with Proper Pattern

Following the proven pattern from the context, we'll separate:
- **Initial load** (controls `isLoading`, awaits role check)
- **Ongoing changes** (updates state, fire-and-forget role checks)

Key changes:
- Add `isMounted` flag to prevent state updates after unmount
- Add 5-second safety timeout
- Ensure `finally` block always sets `isLoading: false`
- Make sign-out immediate with state reset before async operations

```typescript
useEffect(() => {
  let isMounted = true;
  
  // Safety timeout - never hang more than 5 seconds
  const safetyTimeout = setTimeout(() => {
    if (isMounted) {
      console.warn('Admin auth check timed out');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, 5000);

  // LISTENER for ongoing changes (does NOT control isLoading)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_OUT') {
        setState({
          user: null, session: null, role: null,
          permissions: getPermissions(null),
          isLoading: false, isAuthenticated: false, error: null,
        });
        return;
      }
      
      // Fire and forget role check for sign-in
      if (event === 'SIGNED_IN' && session?.user) {
        fetchUserRole(session.user.id).then(role => {
          if (isMounted) {
            setState({
              user: session.user, session, role,
              permissions: getPermissions(role),
              isLoading: false,
              isAuthenticated: !!role,
              error: role ? null : 'No admin access',
            });
          }
        });
      }
    }
  );

  // INITIAL load (controls isLoading)
  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        if (isMounted) {
          setState({
            user: null, session: null, role: null,
            permissions: getPermissions(null),
            isLoading: false, isAuthenticated: false, error: null,
          });
        }
        return;
      }

      // Await role check BEFORE setting loading false
      const role = await fetchUserRole(session.user.id);
      
      if (isMounted) {
        setState({
          user: session.user, session, role,
          permissions: getPermissions(role),
          isLoading: false,
          isAuthenticated: !!role,
          error: role ? null : 'No admin access',
        });
      }
    } catch (err) {
      if (isMounted) {
        setState({
          user: null, session: null, role: null,
          permissions: getPermissions(null),
          isLoading: false, isAuthenticated: false,
          error: 'Auth check failed',
        });
      }
    } finally {
      clearTimeout(safetyTimeout);
    }
  };

  initializeAuth();

  return () => {
    isMounted = false;
    clearTimeout(safetyTimeout);
    subscription.unsubscribe();
  };
}, [fetchUserRole]);
```

#### 2. Fix Immediate Sign-Out Redirect

Update the `signOut` function to reset state immediately:

```typescript
const signOut = async () => {
  // IMMEDIATELY reset state and redirect - don't wait for async
  setState({
    user: null, session: null, role: null,
    permissions: getPermissions(null),
    isLoading: false, isAuthenticated: false, error: null,
  });
  navigate('/admin/login', { replace: true });
  
  // Background cleanup
  try {
    if (state.user) {
      await supabase.rpc('log_audit', { /* ... */ });
    }
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign out cleanup error:', err);
  }
};
```

---

### Files Changed

| File | Changes |
|------|---------|
| `src/admin/hooks/useAdminAuth.ts` | Complete rewrite with proper pattern: separated initial/ongoing load, safety timeout, immediate sign-out |

---

### Testing Checklist

After implementation:

1. **Visit `/admin/login` without session** → Should load login form immediately (no spinner)
2. **Visit `/admin/dashboard` without session** → Should redirect to login immediately
3. **Login with valid admin credentials** → Should redirect to dashboard
4. **Click logout** → Should redirect to login page immediately
5. **Wait for session to expire** → Should redirect to login gracefully
6. **Clear localStorage and visit admin pages** → Should redirect to login within 5 seconds max

