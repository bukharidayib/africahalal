import { useEffect, useState } from "react";
import { InspectorLayout } from "@/components/layout/InspectorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Users, Loader2 } from "lucide-react";

type SupervisorRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  organizations: string[];
};

export default function InspectorManagerSupervisors() {
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [orgCount, setOrgCount] = useState(0);
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

        // Businesses this manager oversees
        const { data: orgLinks } = await (supabase as any)
          .from('inspector_organizations')
          .select('organization_id, organizations:organization_id(id, name)')
          .eq('inspector_id', me.id);
        const orgs = (orgLinks || []).map((r: any) => r.organizations).filter((o: any) => o?.id);
        const orgIds: string[] = orgs.map((o: any) => o.id);
        const orgNameById = new Map<string, string>(orgs.map((o: any) => [o.id, o.name]));
        setOrgCount(orgIds.length);

        if (orgIds.length === 0) { setSupervisors([]); setIsLoading(false); return; }

        // Supervisors assigned to those businesses
        const { data: supLinks } = await supabase
          .from('organization_supervisors')
          .select('supervisor_id, organization_id')
          .in('organization_id', orgIds);

        const orgsBySup = new Map<string, string[]>();
        (supLinks || []).forEach((row: any) => {
          if (!row.supervisor_id) return;
          const arr = orgsBySup.get(row.supervisor_id) || [];
          const name = orgNameById.get(row.organization_id);
          if (name) arr.push(name);
          orgsBySup.set(row.supervisor_id, arr);
        });

        const supIds = Array.from(orgsBySup.keys());
        if (supIds.length === 0) { setSupervisors([]); setIsLoading(false); return; }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, created_at')
          .in('id', supIds);

        const rows: SupervisorRow[] = supIds.map((sid) => {
          const p = (profiles || []).find((x: any) => x.id === sid) as any;
          return {
            id: sid,
            full_name: p?.full_name ?? "(profile missing)",
            email: p?.email ?? "—",
            phone: p?.phone ?? null,
            created_at: p?.created_at ?? new Date().toISOString(),
            organizations: orgsBySup.get(sid) || [],
          };
        });

        setSupervisors(rows);
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
          <p className="text-muted-foreground mt-1">
            Supervisors assigned to {orgCount} business{orgCount === 1 ? "" : "es"} under your management.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : supervisors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {orgCount === 0
                  ? "You have no businesses assigned yet — ask Admin to assign your manager account to organizations."
                  : "No supervisors are assigned to your businesses yet."}
              </p>
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
                  <TableHead>Businesses Covered</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisors.map((sup) => (
                  <TableRow key={sup.id}>
                    <TableCell className="font-medium">{sup.full_name}</TableCell>
                    <TableCell>{sup.email}</TableCell>
                    <TableCell>{sup.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sup.organizations.map((name, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                        ))}
                      </div>
                    </TableCell>
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
