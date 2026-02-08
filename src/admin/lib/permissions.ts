// Admin role types matching database enum
export type AdminRole = 'super_admin' | 'certification_officer' | 'finance_officer' | 'it_system_auditor' | 'support_agent';

export interface Permission {
  canViewApplications: boolean;
  canManageApplications: boolean;
  canViewCertificates: boolean;
  canIssueCertificates: boolean;
  canViewInspections: boolean;
  canManageInspections: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewEnforcement: boolean;
  canManageEnforcement: boolean;
  canViewSupport: boolean;
  canRespondSupport: boolean;
  canManageSupport: boolean;
  canManageRoles: boolean;
  // New enterprise permissions
  canViewDocumentation: boolean;
  canApproveDocumentation: boolean;
  canViewShariahReview: boolean;
  canApproveShariahReview: boolean;
  canViewFinance: boolean;
  canManageFinance: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
}

export const rolePermissions: Record<AdminRole, Permission> = {
  super_admin: {
    canViewApplications: true,
    canManageApplications: true,
    canViewCertificates: true,
    canIssueCertificates: true,
    canViewInspections: true,
    canManageInspections: true,
    canViewAuditLogs: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewEnforcement: true,
    canManageEnforcement: true,
    canViewSupport: true,
    canRespondSupport: true,
    canManageSupport: true,
    canManageRoles: true,
    canViewDocumentation: true,
    canApproveDocumentation: true,
    canViewShariahReview: true,
    canApproveShariahReview: true,
    canViewFinance: true,
    canManageFinance: true,
    canViewReports: true,
    canExportReports: true,
  },
  certification_officer: {
    canViewApplications: true,
    canManageApplications: true,
    canViewCertificates: true,
    canIssueCertificates: true,
    canViewInspections: true,
    canManageInspections: true,
    canViewAuditLogs: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEnforcement: true,
    canManageEnforcement: true,
    canViewSupport: false,
    canRespondSupport: false,
    canManageSupport: false,
    canManageRoles: false,
    canViewDocumentation: true,
    canApproveDocumentation: true,
    canViewShariahReview: true,
    canApproveShariahReview: false,
    canViewFinance: false,
    canManageFinance: false,
    canViewReports: true,
    canExportReports: false,
  },
  finance_officer: {
    canViewApplications: true,
    canManageApplications: false,
    canViewCertificates: true,
    canIssueCertificates: false,
    canViewInspections: false,
    canManageInspections: false,
    canViewAuditLogs: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEnforcement: false,
    canManageEnforcement: false,
    canViewSupport: false,
    canRespondSupport: false,
    canManageSupport: false,
    canManageRoles: false,
    canViewDocumentation: false,
    canApproveDocumentation: false,
    canViewShariahReview: false,
    canApproveShariahReview: false,
    canViewFinance: true,
    canManageFinance: true,
    canViewReports: true,
    canExportReports: true,
  },
  it_system_auditor: {
    canViewApplications: true,
    canManageApplications: false,
    canViewCertificates: true,
    canIssueCertificates: false,
    canViewInspections: true,
    canManageInspections: false,
    canViewAuditLogs: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewEnforcement: true,
    canManageEnforcement: false,
    canViewSupport: false,
    canRespondSupport: false,
    canManageSupport: false,
    canManageRoles: false,
    canViewDocumentation: true,
    canApproveDocumentation: false,
    canViewShariahReview: true,
    canApproveShariahReview: false,
    canViewFinance: true,
    canManageFinance: false,
    canViewReports: true,
    canExportReports: true,
  },
  support_agent: {
    canViewApplications: false,
    canManageApplications: false,
    canViewCertificates: false,
    canIssueCertificates: false,
    canViewInspections: false,
    canManageInspections: false,
    canViewAuditLogs: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewEnforcement: false,
    canManageEnforcement: false,
    canViewSupport: true,
    canRespondSupport: true,
    canManageSupport: false,
    canManageRoles: false,
    canViewDocumentation: false,
    canApproveDocumentation: false,
    canViewShariahReview: false,
    canApproveShariahReview: false,
    canViewFinance: false,
    canManageFinance: false,
    canViewReports: false,
    canExportReports: false,
  },
};

export function getPermissions(role: AdminRole | null): Permission {
  if (!role) {
    return {
      canViewApplications: false,
      canManageApplications: false,
      canViewCertificates: false,
      canIssueCertificates: false,
      canViewInspections: false,
      canManageInspections: false,
      canViewAuditLogs: false,
      canManageUsers: false,
      canManageSettings: false,
      canViewEnforcement: false,
      canManageEnforcement: false,
      canViewSupport: false,
      canRespondSupport: false,
      canManageSupport: false,
      canManageRoles: false,
      canViewDocumentation: false,
      canApproveDocumentation: false,
      canViewShariahReview: false,
      canApproveShariahReview: false,
      canViewFinance: false,
      canManageFinance: false,
      canViewReports: false,
      canExportReports: false,
    };
  }
  return rolePermissions[role];
}

export function getRoleDisplayName(role: AdminRole | string): string {
  const names: Record<string, string> = {
    super_admin: 'Super Administrator',
    certification_officer: 'Certification Officer',
    finance_officer: 'Finance Officer',
    it_system_auditor: 'IT System Auditor',
    support_agent: 'Support Agent',
  };
  return names[role] || role;
}

/** High-risk permission codes that need visual warnings */
export const HIGH_RISK_PERMISSIONS = [
  'certificates.issue',
  'certificates.revoke',
  'roles.manage',
  'users.manage',
  'settings.manage',
  'shariah_review.approve',
  'finance.approve',
];

/** Permission module structure for the matrix view */
export const PERMISSION_MODULES: Record<string, { label: string; icon: string }> = {
  'Applications': { label: 'Applications', icon: 'FileText' },
  'Documentation': { label: 'Documentation', icon: 'FolderOpen' },
  'Inspections': { label: 'Inspections', icon: 'ClipboardList' },
  'Shariah Review': { label: 'Shariah Review', icon: 'BookOpen' },
  'Finance': { label: 'Finance', icon: 'DollarSign' },
  'Certificates': { label: 'Certificates', icon: 'Award' },
  'Enforcement': { label: 'Enforcement', icon: 'AlertTriangle' },
  'Users & Roles': { label: 'Users & Roles', icon: 'Shield' },
  'Support': { label: 'Support', icon: 'MessageSquare' },
  'Audit': { label: 'Audit', icon: 'ScrollText' },
  'System': { label: 'System', icon: 'Settings' },
  'Reports': { label: 'Reports', icon: 'BarChart3' },
};
