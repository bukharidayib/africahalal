import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAdminAuthContext } from "../contexts/AdminAuthContext";
import { Permission } from "../lib/permissions";
import { AccessDenied } from "./AccessDenied";

interface PermissionGateProps {
  /** A single permission key required to view children */
  require?: keyof Permission;
  /** Any one of these permissions grants access (OR semantics) */
  requireAny?: (keyof Permission)[];
  /** All of these permissions are required (AND semantics) */
  requireAll?: (keyof Permission)[];
  /** Render this instead of AccessDenied when not allowed */
  fallback?: ReactNode;
  /** When true, renders nothing (instead of AccessDenied) — useful for inline buttons */
  silent?: boolean;
  children: ReactNode;
}

/**
 * Page or section level RBAC guard. Reads permissions from AdminAuthContext.
 *
 * Usage:
 *   <PermissionGate require="canViewCertificates">
 *     <CertificatesPage />
 *   </PermissionGate>
 */
export function PermissionGate({
  require,
  requireAny,
  requireAll,
  fallback,
  silent,
  children,
}: PermissionGateProps) {
  const { permissions, isLoading } = useAdminAuthContext();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  let allowed = true;
  if (require) allowed = allowed && !!permissions[require];
  if (requireAny && requireAny.length) {
    allowed = allowed && requireAny.some((k) => !!permissions[k]);
  }
  if (requireAll && requireAll.length) {
    allowed = allowed && requireAll.every((k) => !!permissions[k]);
  }

  if (allowed) return <>{children}</>;
  if (silent) return null;
  if (fallback) return <>{fallback}</>;

  const requiredLabel =
    require ||
    (requireAny && requireAny.join(" OR ")) ||
    (requireAll && requireAll.join(" AND ")) ||
    undefined;

  return <AccessDenied requiredPermission={requiredLabel as string | undefined} />;
}

/**
 * Hook variant for action-level checks inside a page.
 *   const { allowed } = useHasPermission("canIssueCertificates");
 */
export function useHasPermission(
  key: keyof Permission | (keyof Permission)[]
): { allowed: boolean; isLoading: boolean } {
  const { permissions, isLoading } = useAdminAuthContext();
  const allowed = Array.isArray(key)
    ? key.some((k) => !!permissions[k])
    : !!permissions[key];
  return { allowed, isLoading };
}
