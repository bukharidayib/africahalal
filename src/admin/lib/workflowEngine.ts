
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'reject' | 'issue' | 'revoke';
export type ResourceType = 'application' | 'inspection' | 'certificate' | 'user' | 'role' | 'audit' | 'blog';

export interface PermissionCheck {
    resource: ResourceType;
    action: ActionType;
    context?: any; // For future stage-based checks
}

/**
 * Enterprise Workflow Permission Engine
 * 
 * Enforces permissions based on:
 * 1. RBAC (Role-Based Access Control)
 * 2. Context (Workflow Stage matching)
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
     * Check if a user can perform a workflow action
     * e.g. 'can user approve application at review stage?'
     */
    static async canPerformAction(
        userId: string,
        resource: ResourceType,
        action: ActionType
    ): Promise<boolean> {

        // 1. Map Resource+Action to Permission Code
        const permissionCode = this.getPermissionCode(resource, action);
        if (!permissionCode) return false;

        // 2. Perform DB check
        return this.hasPermission(userId, permissionCode);
    }

    /**
     * Map resource actions to their specific permission codes
     */
    private static getPermissionCode(resource: ResourceType, action: ActionType): string | null {
        const map: Record<string, string> = {
            'application:read': 'application.view',
            'application:create': 'application.create',
            'application:update': 'application.edit',
            'application:approve': 'application.decision.approve',
            'application:reject': 'application.decision.reject',

            'inspection:read': 'inspection.view',
            'inspection:create': 'inspection.schedule', // scheduling is creating an inspection

            'certificate:read': 'certificate.view',
            'certificate:issue': 'certificate.issue',
            'certificate:revoke': 'certificate.revoke',

            'user:read': 'users.view',
            'user:update': 'users.manage',
            'user:create': 'users.manage',
            'user:delete': 'users.manage',

            'role:read': 'roles.manage',
            'role:create': 'roles.manage',
            'role:update': 'roles.manage',
            'role:delete': 'roles.manage',

            'audit:read': 'audit.view',
        };

        return map[`${resource}:${action}`] || null;
    }
}
