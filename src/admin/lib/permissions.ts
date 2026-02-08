// Admin role type - now fully dynamic, no hardcoded list
export type AdminRole = string;

export interface Permission {
  // Applications
  canCreateApplications: boolean;
  canViewApplications: boolean;
  canUpdateApplications: boolean;
  canDeleteApplications: boolean;
  canManageApplications: boolean;
  canAssignApplications: boolean;
  canApproveApplications: boolean;
  canRejectApplications: boolean;
  // Documentation
  canCreateDocumentation: boolean;
  canViewDocumentation: boolean;
  canUpdateDocumentation: boolean;
  canDeleteDocumentation: boolean;
  canApproveDocumentation: boolean;
  canUploadDocumentation: boolean;
  // Inspections
  canCreateInspections: boolean;
  canViewInspections: boolean;
  canUpdateInspections: boolean;
  canDeleteInspections: boolean;
  canManageInspections: boolean;
  canScheduleInspections: boolean;
  canApproveInspectionReport: boolean;
  // Shariah Review
  canCreateShariahReview: boolean;
  canViewShariahReview: boolean;
  canUpdateShariahReview: boolean;
  canDeleteShariahReview: boolean;
  canSubmitShariahReview: boolean;
  canApproveShariahReview: boolean;
  // Finance
  canCreateFinance: boolean;
  canViewFinance: boolean;
  canUpdateFinance: boolean;
  canDeleteFinance: boolean;
  canManageFinance: boolean;
  canApproveFinance: boolean;
  // Certificates
  canCreateCertificates: boolean;
  canViewCertificates: boolean;
  canUpdateCertificates: boolean;
  canDeleteCertificates: boolean;
  canIssueCertificates: boolean;
  canRevokeCertificates: boolean;
  // Enforcement
  canCreateEnforcement: boolean;
  canViewEnforcement: boolean;
  canUpdateEnforcement: boolean;
  canDeleteEnforcement: boolean;
  canManageEnforcement: boolean;
  // Support
  canCreateSupport: boolean;
  canViewSupport: boolean;
  canUpdateSupport: boolean;
  canDeleteSupport: boolean;
  canRespondSupport: boolean;
  canManageSupport: boolean;
  // Users
  canCreateUsers: boolean;
  canViewUsers: boolean;
  canUpdateUsers: boolean;
  canDeleteUsers: boolean;
  canManageUsers: boolean;
  // Roles
  canCreateRoles: boolean;
  canViewRoles: boolean;
  canUpdateRoles: boolean;
  canDeleteRoles: boolean;
  canManageRoles: boolean;
  // Audit
  canViewAuditLogs: boolean;
  // Reports
  canCreateReports: boolean;
  canViewReports: boolean;
  canDeleteReports: boolean;
  canExportReports: boolean;
  // System
  canViewSettings: boolean;
  canUpdateSettings: boolean;
  canManageSettings: boolean;
}

/** Build a zero-permission object */
function emptyPermissions(): Permission {
  return {
    canCreateApplications: false, canViewApplications: false, canUpdateApplications: false, canDeleteApplications: false,
    canManageApplications: false, canAssignApplications: false, canApproveApplications: false, canRejectApplications: false,
    canCreateDocumentation: false, canViewDocumentation: false, canUpdateDocumentation: false, canDeleteDocumentation: false,
    canApproveDocumentation: false, canUploadDocumentation: false,
    canCreateInspections: false, canViewInspections: false, canUpdateInspections: false, canDeleteInspections: false,
    canManageInspections: false, canScheduleInspections: false, canApproveInspectionReport: false,
    canCreateShariahReview: false, canViewShariahReview: false, canUpdateShariahReview: false, canDeleteShariahReview: false,
    canSubmitShariahReview: false, canApproveShariahReview: false,
    canCreateFinance: false, canViewFinance: false, canUpdateFinance: false, canDeleteFinance: false,
    canManageFinance: false, canApproveFinance: false,
    canCreateCertificates: false, canViewCertificates: false, canUpdateCertificates: false, canDeleteCertificates: false,
    canIssueCertificates: false, canRevokeCertificates: false,
    canCreateEnforcement: false, canViewEnforcement: false, canUpdateEnforcement: false, canDeleteEnforcement: false,
    canManageEnforcement: false,
    canCreateSupport: false, canViewSupport: false, canUpdateSupport: false, canDeleteSupport: false,
    canRespondSupport: false, canManageSupport: false,
    canCreateUsers: false, canViewUsers: false, canUpdateUsers: false, canDeleteUsers: false, canManageUsers: false,
    canCreateRoles: false, canViewRoles: false, canUpdateRoles: false, canDeleteRoles: false, canManageRoles: false,
    canViewAuditLogs: false,
    canCreateReports: false, canViewReports: false, canDeleteReports: false, canExportReports: false,
    canViewSettings: false, canUpdateSettings: false, canManageSettings: false,
  };
}

/** Map from DB permission codes to Permission keys */
const CODE_TO_KEY: Record<string, keyof Permission> = {
  'applications.create': 'canCreateApplications',
  'applications.view': 'canViewApplications',
  'applications.update': 'canUpdateApplications',
  'applications.delete': 'canDeleteApplications',
  'applications.manage': 'canManageApplications',
  'applications.assign': 'canAssignApplications',
  'applications.approve': 'canApproveApplications',
  'applications.reject': 'canRejectApplications',
  'documentation.create': 'canCreateDocumentation',
  'documentation.view': 'canViewDocumentation',
  'documentation.update': 'canUpdateDocumentation',
  'documentation.delete': 'canDeleteDocumentation',
  'documentation.approve': 'canApproveDocumentation',
  'documentation.upload': 'canUploadDocumentation',
  'inspections.create': 'canCreateInspections',
  'inspections.view': 'canViewInspections',
  'inspections.update': 'canUpdateInspections',
  'inspections.delete': 'canDeleteInspections',
  'inspections.manage': 'canManageInspections',
  'inspections.schedule': 'canScheduleInspections',
  'inspections.approve_report': 'canApproveInspectionReport',
  'shariah_review.create': 'canCreateShariahReview',
  'shariah_review.view': 'canViewShariahReview',
  'shariah_review.update': 'canUpdateShariahReview',
  'shariah_review.delete': 'canDeleteShariahReview',
  'shariah_review.submit': 'canSubmitShariahReview',
  'shariah_review.approve': 'canApproveShariahReview',
  'finance.create': 'canCreateFinance',
  'finance.view': 'canViewFinance',
  'finance.update': 'canUpdateFinance',
  'finance.delete': 'canDeleteFinance',
  'finance.manage': 'canManageFinance',
  'finance.approve': 'canApproveFinance',
  'certificates.create': 'canCreateCertificates',
  'certificates.view': 'canViewCertificates',
  'certificates.update': 'canUpdateCertificates',
  'certificates.delete': 'canDeleteCertificates',
  'certificates.issue': 'canIssueCertificates',
  'certificates.revoke': 'canRevokeCertificates',
  'enforcement.create': 'canCreateEnforcement',
  'enforcement.view': 'canViewEnforcement',
  'enforcement.update': 'canUpdateEnforcement',
  'enforcement.delete': 'canDeleteEnforcement',
  'enforcement.manage': 'canManageEnforcement',
  'support.create': 'canCreateSupport',
  'support.view': 'canViewSupport',
  'support.update': 'canUpdateSupport',
  'support.delete': 'canDeleteSupport',
  'support.respond': 'canRespondSupport',
  'support.manage': 'canManageSupport',
  'users.create': 'canCreateUsers',
  'users.view': 'canViewUsers',
  'users.update': 'canUpdateUsers',
  'users.delete': 'canDeleteUsers',
  'users.manage': 'canManageUsers',
  'roles.create': 'canCreateRoles',
  'roles.view': 'canViewRoles',
  'roles.update': 'canUpdateRoles',
  'roles.delete': 'canDeleteRoles',
  'roles.manage': 'canManageRoles',
  'audit_logs.view': 'canViewAuditLogs',
  'reports.create': 'canCreateReports',
  'reports.view': 'canViewReports',
  'reports.delete': 'canDeleteReports',
  'reports.export': 'canExportReports',
  'settings.view': 'canViewSettings',
  'settings.update': 'canUpdateSettings',
  'settings.manage': 'canManageSettings',
};

/** Convert an array of permission codes from the DB into the Permission object */
export function convertCodesToPermissions(codes: string[]): Permission {
  const perms = emptyPermissions();
  for (const code of codes) {
    const key = CODE_TO_KEY[code];
    if (key) {
      perms[key] = true;
    }
  }
  return perms;
}

/** Fallback: return empty permissions when role is null (unauthenticated) */
export function getPermissions(role: AdminRole | null): Permission {
  if (!role) return emptyPermissions();
  // For any role, return empty - actual permissions come from DB via convertCodesToPermissions
  return emptyPermissions();
}

export function getRoleDisplayName(role: AdminRole | string): string {
  // No more hardcoded names - return formatted version of the code
  return role
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** High-risk permission codes that need visual warnings in the UI */
export const HIGH_RISK_PERMISSIONS = [
  'certificates.issue',
  'certificates.revoke',
  'certificates.delete',
  'roles.manage',
  'roles.delete',
  'users.manage',
  'users.delete',
  'settings.manage',
  'shariah_review.approve',
  'finance.approve',
  'applications.approve',
  'applications.reject',
  'applications.delete',
];

/** Module display config for the CRUD matrix */
export const PERMISSION_MODULES: Record<string, { label: string; icon: string }> = {
  'Applications': { label: 'Applications', icon: 'FileText' },
  'Documentation': { label: 'Documentation', icon: 'FolderOpen' },
  'Inspections': { label: 'Inspections', icon: 'ClipboardList' },
  'Shariah Review': { label: 'Shariah Review', icon: 'BookOpen' },
  'Finance': { label: 'Finance', icon: 'DollarSign' },
  'Certificates': { label: 'Certificates', icon: 'Award' },
  'Enforcement': { label: 'Enforcement', icon: 'AlertTriangle' },
  'Support': { label: 'Support', icon: 'MessageSquare' },
  'Users': { label: 'Users', icon: 'Users' },
  'Roles': { label: 'Roles', icon: 'Shield' },
  'Audit': { label: 'Audit', icon: 'ScrollText' },
  'Reports': { label: 'Reports', icon: 'BarChart3' },
  'System': { label: 'System', icon: 'Settings' },
};
