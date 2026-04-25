import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface AccessDeniedProps {
  message?: string;
  requiredPermission?: string;
}

export function AccessDenied({ message, requiredPermission }: AccessDeniedProps) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            {message || "You do not have permission to view this page."}
          </p>
          {requiredPermission && (
            <p className="text-xs text-muted-foreground/80">
              Required permission: <code className="font-mono">{requiredPermission}</code>
            </p>
          )}
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          <Button onClick={() => navigate("/admin/dashboard")}>Dashboard</Button>
        </div>
      </Card>
    </div>
  );
}
