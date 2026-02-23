import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Award,
  CheckSquare,
  ClipboardList,
  Users,
  AlertTriangle,
  ScrollText,
  Settings,
  Shield,
  MessageSquare,
  Key,
  Receipt,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { Permission } from '../../lib/permissions';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof Permission;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Applications',
    href: '/admin/applications',
    icon: FileText,
    permission: 'canViewApplications',
  },
  {
    title: 'Pending Approvals',
    href: '/admin/approvals',
    icon: CheckSquare,
    permission: 'canIssueCertificates',
  },
  {
    title: 'Certificates',
    href: '/admin/certificates',
    icon: Award,
    permission: 'canViewCertificates',
  },
  {
    title: 'Inspections',
    href: '/admin/inspections',
    icon: ClipboardList,
    permission: 'canViewInspections',
  },
  {
    title: 'Inspectors',
    href: '/admin/inspectors',
    icon: Users,
    permission: 'canManageInspectors',
  },
  {
    title: 'Enforcement',
    href: '/admin/enforcement',
    icon: AlertTriangle,
    permission: 'canViewEnforcement',
  },
  {
    title: 'Billing & Invoices',
    href: '/admin/billing',
    icon: Receipt,
    permission: 'canViewFinance',
  },
  {
    title: 'Support Center',
    href: '/admin/support',
    icon: MessageSquare,
    permission: 'canViewSupport',
  },
  {
    title: 'Ingredient Tracker',
    href: '/admin/ingredients',
    icon: FlaskConical,
    permission: 'canViewApplications',
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: ScrollText,
    permission: 'canViewAuditLogs',
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Shield,
    permission: 'canManageUsers',
  },
  {
    title: 'Roles & Permissions',
    href: '/admin/roles',
    icon: Key,
    permission: 'canManageRoles',
  },
  {
    title: 'Supervisors',
    href: '/admin/supervisors',
    icon: Users,
    permission: 'canManageUsers',
  },
  {
    title: 'Blog CMS',
    href: '/admin/blogs',
    icon: FileText,
    permission: 'canManageSettings',
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: 'canManageSettings',
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { permissions } = useAdminAuthContext();

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    return permissions[item.permission as keyof typeof permissions];
  });

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <img src="/logo.png" alt="AHI" className="h-8 w-auto" />
        <div>
          <h1 className="text-sm font-bold">AHI Admin</h1>
          <p className="text-xs text-sidebar-foreground/70">Certification Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
        <div className="text-xs text-sidebar-foreground/60">
          <p>African Halal Institute</p>
          <p>© {new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </aside>
  );
}
