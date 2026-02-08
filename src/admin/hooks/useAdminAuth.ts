import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { AdminRole, getPermissions, Permission } from '../lib/permissions';

interface AdminAuthState {
  user: User | null;
  session: Session | null;
  role: AdminRole | null;
  permissions: Permission;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AdminAuthState = {
  user: null,
  session: null,
  role: null,
  permissions: getPermissions(null),
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

const unauthenticatedState: AdminAuthState = {
  user: null,
  session: null,
  role: null,
  permissions: getPermissions(null),
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

export function useAdminAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminAuthState>(initialState);
  const stateRef = useRef(state);
  
  // Keep ref in sync for signOut access
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchUserRole = useCallback(async (userId: string): Promise<AdminRole | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role_id, admin_roles!inner(name, status)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      // Extract role name and status from the joined admin_roles table
      const roleData = (data as any)?.admin_roles;
      const roleName = roleData?.name;
      const roleStatus = roleData?.status;

      // If role is suspended, deny access
      if (roleStatus === 'suspended') {
        console.warn('User role is suspended:', roleName);
        return null;
      }

      return roleName as AdminRole || null;
    } catch (err) {
      console.error('Failed to fetch user role:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - never hang more than 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Admin auth check timed out - forcing unauthenticated state');
        setState(unauthenticatedState);
      }
    }, 5000);

    // LISTENER for ongoing auth changes (does NOT control initial isLoading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setState(unauthenticatedState);
          return;
        }

        // Handle sign-in with fire-and-forget role check
        if (event === 'SIGNED_IN' && session?.user) {
          fetchUserRole(session.user.id).then(role => {
            if (isMounted) {
              setState({
                user: session.user,
                session,
                role,
                permissions: getPermissions(role),
                isLoading: false,
                isAuthenticated: !!role,
                error: role ? null : 'You do not have admin access to this portal.',
              });
            }
          });
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
          }));
        }
      }
    );

    // INITIAL load (controls isLoading state)
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // Handle session errors (expired tokens, etc.)
        if (error) {
          console.warn('Session error:', error.message);
          // Try to clean up if it's a token error
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              // Ignore cleanup errors
            }
          }
          if (isMounted) {
            setState(unauthenticatedState);
          }
          return;
        }

        // No session - user not logged in
        if (!session) {
          if (isMounted) {
            setState(unauthenticatedState);
          }
          return;
        }

        // Session exists - fetch role BEFORE setting loading false
        const role = await fetchUserRole(session.user.id);

        if (isMounted) {
          setState({
            user: session.user,
            session,
            role,
            permissions: getPermissions(role),
            isLoading: false,
            isAuthenticated: !!role,
            error: role ? null : 'You do not have admin access to this portal.',
          });
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (isMounted) {
          setState({
            ...unauthenticatedState,
            error: 'Authentication check failed.',
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

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        const role = await fetchUserRole(data.session.user.id);

        if (!role) {
          await supabase.auth.signOut();
          throw new Error('You do not have admin access to this portal.');
        }

        // Log the login action
        try {
          await supabase.rpc('log_audit', {
            _action: 'admin_login',
            _resource_type: 'auth',
            _resource_id: data.session.user.id,
            _reason_code: 'successful_login',
            _metadata: { email },
          });
        } catch (auditErr) {
          console.warn('Failed to log audit:', auditErr);
        }

        setState({
          user: data.session.user,
          session: data.session,
          role,
          permissions: getPermissions(role),
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Login failed. Please check your credentials.',
      }));
    }
  };

  const signOut = async () => {
    // Capture current user for audit log before clearing state
    const currentUser = stateRef.current.user;

    // IMMEDIATELY reset state and redirect - don't wait for async operations
    setState(unauthenticatedState);
    navigate('/admin/login', { replace: true });

    // Background cleanup - fire and forget
    (async () => {
      try {
        if (currentUser) {
          await supabase.rpc('log_audit', {
            _action: 'admin_logout',
            _resource_type: 'auth',
            _resource_id: currentUser.id,
            _reason_code: 'user_initiated',
            _metadata: {},
          });
        }
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out cleanup error:', err);
      }
    })();
  };

  const refreshAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setState(unauthenticatedState);
        return;
      }

      const role = await fetchUserRole(session.user.id);

      setState({
        user: session.user,
        session,
        role,
        permissions: getPermissions(role),
        isLoading: false,
        isAuthenticated: !!role,
        error: role ? null : 'You do not have admin access to this portal.',
      });
    } catch (err) {
      console.error('Auth refresh failed:', err);
      setState(unauthenticatedState);
    }
  }, [fetchUserRole]);

  return {
    ...state,
    signIn,
    signOut,
    refreshAuth,
  };
}
