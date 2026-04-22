import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Users, Loader2 } from "lucide-react";

export default function InspectorManagerSupervisors() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoading(false); return; }

        const { data: me } = await supabase
          .from('inspectors')
          .select('id, is_manager')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!me?.is_manager) { setSupervisors([]); setIsLoading(false); return; }

        // Get the businesses this manager covers
        const { data: orgLinks } = await (supabase as any)
          .from('inspector_organizations')
          .select('organization_id')
          .eq('inspector_id', me.id);
        const orgIds = (orgLinks || []).map((r: any) => r.organization_id);

        if (orgIds.length === 0) { setSupervisors([]); setIsLoading(false); return; }

        // Supervisors assigned to those businesses
        const { data: supLinks } = await supabase
          .from('organization_supervisors')
          .select('supervisor_id')
          .in('organization_id', orgIds);
        const supIds = Array.from(new Set((supLinks || []).map((r: any) => r.supervisor_id).filter(Boolean)));

        if (supIds.length === 0) { setSupervisors([]); setIsLoading(false); return; }

        const { data: profiles } = await supabase.from('profiles').select('*').in('id', supIds);
        setSupervisors(profiles || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <InspectorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-serif">Manage Supervisors</h1>
          <p className="text-muted-foreground mt-1">View and manage supervisors across the system</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : supervisors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No supervisors found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisors.map((sup: any) => (
                  <TableRow key={sup.id}>
                    <TableCell className="font-medium">{sup.full_name}</TableCell>
                    <TableCell>{sup.email}</TableCell>
                    <TableCell>{sup.phone || "—"}</TableCell>
                    <TableCell>{format(new Date(sup.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </InspectorLayout>
  );
}
