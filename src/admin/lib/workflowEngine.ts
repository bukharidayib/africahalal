import { supabase } from '@/integrations/supabase/client';

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject' | 'issue' | 'revoke';
export type ResourceType = 'application' | 'inspection' | 'certificate' | 'user' | 'role' | 'audit' | 'blog' | 'documentation' | 'shariah_review' | 'finance' | 'report';

export interface WorkflowStage {
  id: string;
  name: string;
  system_code: string;
  display_name: string;
  stage_order: number;
  description: string | null;
  is_active: boolean;
}

/**
 * Enterprise Workflow Permission Engine
 * 
 * Enforces permissions based on:
 * 1. RBAC (Role-Based Access Control) with active role status
 * 2. Workflow Stage permissions (role must be allowed at current stage)
 * 3. Self-approval prevention (no acting on your own previous-stage work)
 * 4. Forward-only stage progression
 */
export class WorkflowEngine {

  /**
   * Check if a user has a specific permission code
   */
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_permission', {
      _user_id: userId,
      _permission_code: permissionCode
    });

    if (error) {
      console.error('Permission check failed:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Check if a user can act in a specific workflow stage with a specific permission.
   * Validates: active role + permission + stage assignment.
   */
  static async canActInStage(
    userId: string,
    stageCode: string,
    permissionCode: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_perform_workflow_action', {
      _user_id: userId,
      _stage_code: stageCode,
      _permission_code: permissionCode
    });

    if (error) {
      console.error('Workflow action check failed:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Validate forward-only stage progression.
   * Returns true if moving from fromStage to toStage is allowed.
   */
  static async canProgressStage(
    fromStage: string,
    toStage: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('validate_stage_progression', {
      _from_stage: fromStage,
      _to_stage: toStage
    });

    if (error) {
      console.error('Stage progression check failed:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Check self-approval prevention.
   * Returns true if the user is NOT the same person who acted in the previous stage.
   */
  static async isNotSelfApproving(
    applicationId: string,
    userId: string,
    currentStage: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_self_approval', {
      _application_id: applicationId,
      _user_id: userId,
      _current_stage: currentStage
    });

    if (error) {
      console.error('Self-approval check failed:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Get all workflow stages from the database.
   */
  static async getWorkflowStages(): Promise<WorkflowStage[]> {
    const { data, error } = await (supabase
      .from('workflow_stages' as any)
      .select('*')
      .eq('is_active', true)
      .order('stage_order', { ascending: true }) as any);

    if (error) {
      console.error('Failed to fetch workflow stages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all available actions a user can perform at a given stage.
   */
  static async getAvailableActions(
    userId: string,
    stageCode: string
  ): Promise<string[]> {
    // Get user's role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .single();

    if (!roleData) return [];

    // Get permissions assigned to this role at this stage
    const { data, error } = await (supabase
      .from('workflow_stage_permissions' as any)
      .select(`
        permissions:permission_id (code, name)
      `)
      .eq('role_id', roleData.role_id)
      .in('stage_id', (
        supabase
          .from('workflow_stages' as any)
          .select('id')
          .eq('system_code', stageCode) as any
      )) as any);

    if (error) {
      console.error('Failed to fetch available actions:', error);
      return [];
    }

    return (data || []).map((d: any) => d.permissions?.code).filter(Boolean);
  }

  /**
   * Get which stages a role can participate in.
   */
  static async getRoleStages(roleId: string): Promise<WorkflowStage[]> {
    const { data, error } = await (supabase
      .from('workflow_stage_permissions' as any)
      .select(`
        workflow_stages:stage_id (id, name, system_code, display_name, stage_order, description, is_active)
      `)
      .eq('role_id', roleId) as any);

    if (error) {
      console.error('Failed to fetch role stages:', error);
      return [];
    }

    // Deduplicate stages
    const stageMap = new Map<string, WorkflowStage>();
    (data || []).forEach((d: any) => {
      const stage = d.workflow_stages;
      if (stage && !stageMap.has(stage.id)) {
        stageMap.set(stage.id, stage);
      }
    });

    return Array.from(stageMap.values()).sort((a, b) => a.stage_order - b.stage_order);
  }

  /**
   * Map resource+action to permission code (backward compatibility).
   */
  static async canPerformAction(
    userId: string,
    resource: ResourceType,
    action: ActionType
  ): Promise<boolean> {
    const permissionCode = this.getPermissionCode(resource, action);
    if (!permissionCode) return false;
    return this.hasPermission(userId, permissionCode);
  }

  /**
   * Map resource actions to their specific permission codes
   */
  private static getPermissionCode(resource: ResourceType, action: ActionType): string | null {
    const map: Record<string, string> = {
      'application:read': 'applications.view',
      'application:create': 'applications.manage',
      'application:update': 'applications.manage',
      'application:approve': 'applications.manage',
      'application:reject': 'applications.manage',

      'inspection:read': 'inspections.view',
      'inspection:create': 'inspections.manage',

      'certificate:read': 'certificates.view',
      'certificate:issue': 'certificates.issue',
      'certificate:revoke': 'certificates.revoke',

      'documentation:read': 'documentation.view',
      'documentation:approve': 'documentation.approve',
      'documentation:create': 'documentation.upload',

      'shariah_review:read': 'shariah_review.view',
      'shariah_review:create': 'shariah_review.submit',
      'shariah_review:approve': 'shariah_review.approve',

      'finance:read': 'finance.view',
      'finance:update': 'finance.manage',
      'finance:approve': 'finance.approve',

      'report:read': 'reports.view',

      'user:read': 'users.manage',
      'user:update': 'users.manage',
      'user:create': 'users.manage',
      'user:delete': 'users.manage',

      'role:read': 'roles.manage',
      'role:create': 'roles.manage',
      'role:update': 'roles.manage',
      'role:delete': 'roles.manage',

      'audit:read': 'audit_logs.view',
    };

    return map[`${resource}:${action}`] || null;
  }
}
