import { useEffect, useState } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Plus, FlaskConical } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  analyzed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  flagged: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function SupervisorIngredients() {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase
        .from("supervisor_ingredient_collections" as any)
        .select("*, organizations(name)")
        .eq("supervisor_id", session.user.id)
        .order("created_at", { ascending: false }) as any);
      setCollections((data as any[]) || []);
      setIsLoading(false);
    }
    load();
  }, []);

  return (
    <SupervisorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Ingredient Collections</h1>
            <p className="text-muted-foreground mt-1">Log ingredients collected from your assigned company</p>
          </div>
          <Button asChild>
            <Link to="/supervisor/ingredients/new">
              <Plus className="mr-2 h-4 w-4" /> Collect Ingredients
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : collections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No ingredient collections yet.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/supervisor/ingredients/new">Start your first collection</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{format(new Date(c.collection_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{(c as any).organizations?.name || "—"}</TableCell>
                    <TableCell>{c.product_name}</TableCell>
                    <TableCell>{c.brand || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[c.status] || ""}`}>
                        {c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </SupervisorLayout>
  );
}
