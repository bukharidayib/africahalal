import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Award, 
  ClipboardList, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus
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
  pendingApprovals: number;
}

export default function AdminDashboard() {
  const { user, role, permissions } = useAdminAuthContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingReview: 0,
    activeCertificates: 0,
    scheduledInspections: 0,
    openNCNs: 0,
    pendingApprovals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch applications count
        const { count: totalApps } = await supabase
          .from('certification_applications')
          .select('*', { count: 'exact', head: true });

        // Fetch pending review applications
        const { count: pendingReview } = await supabase
          .from('certification_applications')
          .select('*', { count: 'exact', head: true })
          .in('status', ['submitted', 'under_review']);

        // Fetch active certificates
        const { count: activeCerts } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // Fetch scheduled inspections
        const { count: scheduledInsp } = await supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled');

        // Fetch open NCNs
        const { count: openNCNs } = await supabase
          .from('non_conformance_notices')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');

        // Fetch pending approvals
        const { count: pendingApprovals } = await supabase
          .from('approval_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setStats({
          totalApplications: totalApps || 0,
          pendingReview: pendingReview || 0,
          activeCertificates: activeCerts || 0,
          scheduledInspections: scheduledInsp || 0,
          openNCNs: openNCNs || 0,
          pendingApprovals: pendingApprovals || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: FileText,
      description: 'All time applications',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      show: permissions.canViewApplications,
    },
    {
      title: 'Pending Review',
      value: stats.pendingReview,
      icon: Clock,
      description: 'Awaiting officer review',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      show: permissions.canViewApplications,
    },
    {
      title: 'Active Certificates',
      value: stats.activeCertificates,
      icon: Award,
      description: 'Currently valid',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      show: permissions.canViewCertificates,
    },
    {
      title: 'Scheduled Inspections',
      value: stats.scheduledInspections,
      icon: ClipboardList,
      description: 'Upcoming inspections',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      show: permissions.canViewInspections,
    },
    {
      title: 'Open NCNs',
      value: stats.openNCNs,
      icon: AlertTriangle,
      description: 'Requiring attention',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      show: permissions.canViewEnforcement,
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: CheckCircle2,
      description: 'Awaiting dual approval',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      show: permissions.canIssueCertificates,
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : card.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>

          {/* Support Queue */}
          {(permissions.canViewSupport || permissions.canManageSupport) && (
            <SupportQueue />
          )}
        </div>

        {/* Recent Applications & Pending Approvals */}
        <div className="grid gap-4 md:grid-cols-2">
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

          {/* Pending Approvals */}
          {permissions.canIssueCertificates && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
                <CardDescription>Certificates awaiting your approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending approvals</p>
                  <p className="text-sm">Approval requests will appear here</p>
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/admin/approvals">View Approval Queue</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

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
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
