import React, { useState, useEffect, useCallback } from 'react';
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

export function useAdminAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    session: null,
    role: null,
    permissions: getPermissions(null),
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const fetchUserRole = useCallback(async (userId: string): Promise<AdminRole | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AdminRole;
    } catch (err) {
      console.error('Failed to fetch user role:', err);
      return null;
    }
  }, []);

  const checkAdminAuth = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        // Handle refresh token errors gracefully - treat as not authenticated
        if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh_token')) {
          console.warn('Session expired, clearing auth state');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            // Ignore sign out errors
          }
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

      if (!session) {
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

      const role = await fetchUserRole(session.user.id);

      if (!role) {
        setState({
          user: session.user,
          session,
          role: null,
          permissions: getPermissions(null),
          isLoading: false,
          isAuthenticated: false,
          error: 'You do not have admin access to this portal.',
        });
        return;
      }

      setState({
        user: session.user,
        session,
        role,
        permissions: getPermissions(role),
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (err) {
      console.error('Auth check failed:', err);
      setState({
        user: null,
        session: null,
        role: null,
        permissions: getPermissions(null),
        isLoading: false,
        isAuthenticated: false,
        error: 'Authentication check failed.',
      });
    }
  }, [fetchUserRole]);

  useEffect(() => {
    checkAdminAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
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
      } else if (event === 'SIGNED_OUT') {
        setState({
          user: null,
          session: null,
          role: null,
          permissions: getPermissions(null),
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminAuth, fetchUserRole]);

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
        await supabase.rpc('log_audit', {
          _action: 'admin_login',
          _resource_type: 'auth',
          _resource_id: data.session.user.id,
          _reason_code: 'successful_login',
          _metadata: { email },
        });

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
    try {
      // Log the logout action before signing out
      if (state.user) {
        await supabase.rpc('log_audit', {
          _action: 'admin_logout',
          _resource_type: 'auth',
          _resource_id: state.user.id,
          _reason_code: 'user_initiated',
          _metadata: {},
        });
      }

      await supabase.auth.signOut();
      navigate('/admin/login');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return {
    ...state,
    signIn,
    signOut,
    refreshAuth: checkAdminAuth,
  };
}
