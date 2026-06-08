import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { AdminRole, Permission, getPermissions, convertCodesToPermissions } from '../lib/permissions';

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
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchUserRoleAndPermissions = useCallback(async (userId: string): Promise<{ role: AdminRole | null; permissions: Permission }> => {
    try {
      const { data: isAdmin, error: accessError } = await supabase.rpc('is_admin_user', {
        _user_id: userId,
      });

      if (accessError || !isAdmin) {
        if (accessError) console.error('Error checking admin access:', accessError);
        return { role: null, permissions: getPermissions(null) };
      }

      const { data: roleName, error: roleError } = await supabase.rpc('get_user_role', {
        _user_id: userId,
      });

      if (roleError || !roleName) {
        if (roleError) console.error('Error fetching user role:', roleError);
        return { role: null, permissions: getPermissions(null) };
      }

      const { data: permCodes, error: permError } = await supabase.rpc('get_user_permissions', {
        _user_id: userId,
      });

      if (permError) {
        console.error('Error fetching user permissions:', permError);
        return { role: roleName as AdminRole, permissions: getPermissions(null) };
      }

      const permissions = convertCodesToPermissions(permCodes || []);
      return { role: roleName as AdminRole, permissions };
    } catch (err) {
      console.error('Failed to fetch user role:', err);
      return { role: null, permissions: getPermissions(null) };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Admin auth check timed out - forcing unauthenticated state');
        setState(unauthenticatedState);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setState(unauthenticatedState);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          fetchUserRoleAndPermissions(session.user.id).then(({ role, permissions }) => {
            if (isMounted) {
              setState({
                user: session.user,
                session,
                role,
                permissions,
                isLoading: false,
                isAuthenticated: !!role,
                error: role ? null : 'You do not have admin access to this portal.',
              });
            }
          });
        }

        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
          }));
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session error:', error.message);
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            try { await supabase.auth.signOut(); } catch (signOutError) { console.warn('Failed to clear invalid admin session:', signOutError); }
          }
          if (isMounted) setState(unauthenticatedState);
          return;
        }

        if (!session) {
          if (isMounted) setState(unauthenticatedState);
          return;
        }

        const { role, permissions } = await fetchUserRoleAndPermissions(session.user.id);

        if (isMounted) {
          setState({
            user: session.user,
            session,
            role,
            permissions,
            isLoading: false,
            isAuthenticated: !!role,
            error: role ? null : 'You do not have admin access to this portal.',
          });
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (isMounted) {
          setState({ ...unauthenticatedState, error: 'Authentication check failed.' });
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
  }, [fetchUserRoleAndPermissions]);

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (data.session) {
        const { role, permissions } = await fetchUserRoleAndPermissions(data.session.user.id);

        if (!role) {
          await supabase.auth.signOut();
          throw new Error('You do not have admin access to this portal.');
        }

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
          permissions,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        navigate('/admin/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  };

  const signOut = async () => {
    const currentUser = stateRef.current.user;
    setState(unauthenticatedState);
    navigate('/admin/login', { replace: true });

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

      const { role, permissions } = await fetchUserRoleAndPermissions(session.user.id);

      setState({
        user: session.user,
        session,
        role,
        permissions,
        isLoading: false,
        isAuthenticated: !!role,
        error: role ? null : 'You do not have admin access to this portal.',
      });
    } catch (err) {
      console.error('Auth refresh failed:', err);
      setState(unauthenticatedState);
    }
  }, [fetchUserRoleAndPermissions]);

  return {
    ...state,
    signIn,
    signOut,
    refreshAuth,
  };
}
