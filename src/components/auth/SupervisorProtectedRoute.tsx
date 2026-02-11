import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SupervisorProtectedRouteProps {
  children: React.ReactNode;
}

export function SupervisorProtectedRoute({ children }: SupervisorProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    const checkSupervisorAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthorized(false);
        setIsLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }

      // Check if user is a supervisor
      const { data: supervisorRecord } = await supabase
        .from("organization_supervisors")
        .select("id")
        .eq("supervisor_id", session.user.id)
        .limit(1)
        .maybeSingle();

      setIsAuthorized(!!supervisorRecord);
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    };

    checkSupervisorAccess();

    return () => clearTimeout(safetyTimeout);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Verifying supervisor access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
