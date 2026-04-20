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
      // Load all supervisors
      const { data } = await supabase.from('profiles').select('*'); // A better way would be using a view or role check, assuming we pull all users with supervisor role or have a supervisors table.
      // Actually, Supervisor data is mainly in user_roles where role='supervisor'. However, we will just fetch all supervisors from the RPC or views if available. For now, assuming user_roles has 'supervisor' role.
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'supervisor');
      if (roles) {
        const userIds = roles.map((r: any) => r.user_id);
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
        setSupervisors(profiles || []);
      }
      setIsLoading(false);
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
