import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface InspectorProtectedRouteProps {
  children: React.ReactNode;
}

export function InspectorProtectedRoute({ children }: InspectorProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    const checkInspectorAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthorized(false);
        setIsLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }

      const { data: inspectorRecord } = await supabase
        .from("inspectors")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      setIsAuthorized(!!inspectorRecord);
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    };

    checkInspectorAccess();

    return () => clearTimeout(safetyTimeout);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Verifying inspector access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/inspector/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
