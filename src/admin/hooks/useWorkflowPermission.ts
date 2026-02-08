import { useState, useEffect } from 'react';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { WorkflowEngine } from '../lib/workflowEngine';

interface WorkflowPermissionResult {
  isAllowed: boolean;
  isLoading: boolean;
  reason: string | null;
}

/**
 * React hook for UI-level workflow stage permission enforcement.
 * Checks if the current user can perform a specific permission at a given workflow stage.
 */
export function useWorkflowPermission(
  stageCode: string,
  permissionCode: string
): WorkflowPermissionResult {
  const { user, isAuthenticated } = useAdminAuthContext();
  const [result, setResult] = useState<WorkflowPermissionResult>({
    isAllowed: false,
    isLoading: true,
    reason: null,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setResult({ isAllowed: false, isLoading: false, reason: 'Not authenticated' });
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const allowed = await WorkflowEngine.canActInStage(
          user!.id,
          stageCode,
          permissionCode
        );

        if (!cancelled) {
          setResult({
            isAllowed: allowed,
            isLoading: false,
            reason: allowed ? null : 'Your role does not have permission for this action at this workflow stage.',
          });
        }
      } catch (err) {
        if (!cancelled) {
          setResult({
            isAllowed: false,
            isLoading: false,
            reason: 'Permission check failed.',
          });
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [user, isAuthenticated, stageCode, permissionCode]);

  return result;
}

/**
 * Hook to check self-approval prevention for a specific application.
 */
export function useSelfApprovalCheck(
  applicationId: string | null,
  stageCode: string
): { canAct: boolean; isLoading: boolean } {
  const { user, isAuthenticated } = useAdminAuthContext();
  const [canAct, setCanAct] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user || !applicationId) {
      setCanAct(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function check() {
      const result = await WorkflowEngine.isNotSelfApproving(
        applicationId!,
        user!.id,
        stageCode
      );
      if (!cancelled) {
        setCanAct(result);
        setIsLoading(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [user, isAuthenticated, applicationId, stageCode]);

  return { canAct, isLoading };
}
