import React, { useEffect, useState } from 'react';
import {
  FileText, Award, ClipboardList, AlertTriangle, Clock, CheckCircle2,
  Plus, Shield, Users, Key, BarChart3, Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { SupportQueue } from '../components/SupportQueue';

interface DashboardStats {
  totalApplications: number;
  pendingReview: number;
  activeCertificates: number;
  scheduledInspections: number;
  openNCNs: number;
}

interface RBACStats {
  totalAdmins: number;
  usersPerRole: Array<{ role_name: string; count: number; status: string }>;
  activeRoles: number;
  suspendedRoles: number;
  totalPermissions: number;
  recentRoleChanges: Array<{
    action: string;
    user_email: string;
    created_at: string;
    metadata: any;
  }>;
}

export default function AdminDashboard() {
  const { user, role, permissions } = useAdminAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingReview: 0,
    activeCertificates: 0,
    scheduledInspections: 0,
    openNCNs: 0,
  });
  const [rbacStats, setRBACStats] = useState<RBACStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [totalApps, pendingReview, activeCerts, scheduledInsp, openNCNs] =
          await Promise.all([
            supabase.from('certification_applications').select('*', { count: 'exact', head: true }),
            supabase.from('certification_applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'under_review']),
            supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
            supabase.from('non_conformance_notices').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          ]);

        setStats({
          totalApplications: totalApps.count || 0,
          pendingReview: pendingReview.count || 0,
          activeCertificates: activeCerts.count || 0,
          scheduledInspections: scheduledInsp.count || 0,
          openNCNs: openNCNs.count || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Fetch RBAC analytics (only for users with roles.manage permission)
  useEffect(() => {
    if (!permissions.canManageRoles && !permissions.canManageUsers) return;

    async function fetchRBACStats() {
      try {
        const [rolesRes, userRolesRes, permsRes, auditRes] = await Promise.all([
          supabase.from('admin_roles').select('id, display_name, name, status'),
          supabase.from('user_roles').select('role_id, admin_roles(display_name, name, status)'),
          supabase.from('permissions').select('*', { count: 'exact', head: true }),
          supabase.from('audit_logs')
            .select('action, user_email, created_at, metadata')
            .in('action', ['role_assigned', 'role_changed', 'role_removed', 'role_suspended', 'role_activated', 'role_created', 'role_deleted'])
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const roles = rolesRes.data || [];
        const userRoles = (userRolesRes.data as any[]) || [];

        // Count users per role
        const roleCountMap: Record<string, { count: number; status: string }> = {};
        roles.forEach(r => {
          roleCountMap[r.display_name] = { count: 0, status: (r as any).status || 'active' };
        });
        userRoles.forEach(ur => {
          const name = (ur.admin_roles as any)?.display_name;
          if (name && roleCountMap[name]) {
            roleCountMap[name].count++;
          }
        });

        const usersPerRole = Object.entries(roleCountMap).map(([role_name, data]) => ({
          role_name,
          count: data.count,
          status: data.status,
        }));

        setRBACStats({
          totalAdmins: userRoles.length,
          usersPerRole,
          activeRoles: roles.filter(r => (r as any).status === 'active').length,
          suspendedRoles: roles.filter(r => (r as any).status === 'suspended').length,
          totalPermissions: permsRes.count || 0,
          recentRoleChanges: (auditRes.data || []) as any[],
        });
      } catch (error) {
        console.error('Error fetching RBAC stats:', error);
      }
    }

    fetchRBACStats();
  }, [permissions.canManageRoles, permissions.canManageUsers]);

  const statCards = [
    {
      title: 'Total Applications', value: stats.totalApplications,
      icon: FileText, description: 'All time applications',
      color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      show: permissions.canViewApplications,
    },
    {
      title: 'Pending Review', value: stats.pendingReview,
      icon: Clock, description: 'Awaiting officer review',
      color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      show: permissions.canViewApplications,
    },
    {
      title: 'Active Certificates', value: stats.activeCertificates,
      icon: Award, description: 'Currently valid',
      color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30',
      show: permissions.canViewCertificates,
    },
    {
      title: 'Scheduled Inspections', value: stats.scheduledInspections,
      icon: ClipboardList, description: 'Upcoming inspections',
      color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      show: permissions.canViewInspections,
    },
    {
      title: 'Open NCNs', value: stats.openNCNs,
      icon: AlertTriangle, description: 'Requiring attention',
      color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30',
      show: permissions.canViewEnforcement,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-serif">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your certification operations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards
            .filter(card => card.show)
            .map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{isLoading ? '...' : card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* RBAC Analytics Section (Admin Only) */}
        {rbacStats && (permissions.canManageRoles || permissions.canManageUsers) && (
          <>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold font-serif">RBAC Analytics</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Admins</CardTitle>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rbacStats.totalAdmins}</div>
                  <p className="text-xs text-muted-foreground">Across all roles</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Roles</CardTitle>
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rbacStats.activeRoles}</div>
                  <p className="text-xs text-muted-foreground">
                    {rbacStats.suspendedRoles > 0 && (
                      <span className="text-destructive">{rbacStats.suspendedRoles} suspended</span>
                    )}
                    {rbacStats.suspendedRoles === 0 && 'All roles active'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Permissions</CardTitle>
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Key className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rbacStats.totalPermissions}</div>
                  <p className="text-xs text-muted-foreground">Total available</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Role Distribution</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {rbacStats.usersPerRole.slice(0, 4).map(r => (
                      <div key={r.role_name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[120px]">{r.role_name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5">{r.count}</Badge>
                          {r.status === 'suspended' && (
                            <span className="text-destructive text-[10px]">⏸</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Role Changes */}
            {rbacStats.recentRoleChanges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Role Changes
                  </CardTitle>
                  <CardDescription>Last 5 role-related audit events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rbacStats.recentRoleChanges.map((event, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {event.action}
                          </Badge>
                          <span className="text-sm">{event.user_email}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="w-full mt-4">
                    <Link to="/admin/audit-logs">View All Audit Logs</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Activity Feed & Support */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>
          {(permissions.canViewSupport || permissions.canManageSupport) && (
            <SupportQueue />
          )}
        </div>

        {/* Recent Applications */}
        {permissions.canViewApplications && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Applications</CardTitle>
              <CardDescription>Latest submissions requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No applications yet</p>
                <p className="text-sm">New applications will appear here</p>
              </div>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/admin/applications">View All Applications</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Row */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {permissions.canManageApplications && (
                <Button asChild variant="outline">
                  <Link to="/admin/applications">
                    <Plus className="mr-2 h-4 w-4" />
                    New Application
                  </Link>
                </Button>
              )}
              {permissions.canManageInspections && (
                <Button asChild variant="outline">
                  <Link to="/admin/inspections">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Schedule Inspection
                  </Link>
                </Button>
              )}
              {permissions.canIssueCertificates && (
                <Button asChild variant="outline">
                  <Link to="/admin/certificates">
                    <Award className="mr-2 h-4 w-4" />
                    Issue Certificate
                  </Link>
                </Button>
              )}
              {permissions.canManageRoles && (
                <Button asChild variant="outline">
                  <Link to="/admin/roles">
                    <Shield className="mr-2 h-4 w-4" />
                    Manage Roles
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
