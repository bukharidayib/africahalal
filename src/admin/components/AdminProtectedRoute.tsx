import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuthContext } from "../contexts/AdminAuthContext";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route-level guard for the admin portal. Centralises the auth check so
 * individual admin pages don't need to remember to wrap themselves in
 * AdminLayout to enforce protection. AdminLayout still performs its own
 * check as defense-in-depth.
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAdminAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
