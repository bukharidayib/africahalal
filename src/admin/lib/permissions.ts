// Admin role types matching database enum
export type AdminRole = 'super_admin' | 'certification_officer' | 'finance_officer' | 'it_system_auditor';

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
