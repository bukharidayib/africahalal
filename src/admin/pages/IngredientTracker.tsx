import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FlaskConical, Brain, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Search } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  analyzed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  flagged: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const classColors: Record<string, { icon: any; color: string }> = {
  halal: { icon: CheckCircle2, color: "text-green-600" },
  haram: { icon: XCircle, color: "text-red-600" },
  unknown: { icon: HelpCircle, color: "text-amber-600" },
};

export default function IngredientTracker() {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  const loadCollections = async () => {
    const { data } = await (supabase
      .from("supervisor_ingredient_collections" as any)
      .select("*, organizations(name)")
      .order("created_at", { ascending: false }) as any);
    setCollections((data as any[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { loadCollections(); }, []);

  const openDetail = async (collection: any) => {
    setSelectedCollection(collection);
    const { data } = await (supabase
      .from("supervisor_collected_ingredients" as any)
      .select("*")
      .eq("collection_id", collection.id)
      .order("created_at") as any);
    setIngredients((data as any[]) || []);
    setIsDetailOpen(true);
  };

  const analyzeWithAI = async (collection: any) => {
    setIsAnalyzing(collection.id);
    try {
      // Fetch ingredients for this collection
      const { data: ings } = await (supabase
        .from("supervisor_collected_ingredients" as any)
        .select("*")
        .eq("collection_id", collection.id) as any);

      if (!ings || ings.length === 0) {
        toast({ variant: "destructive", title: "No Ingredients", description: "No ingredients to analyze." });
        return;
      }

      // Format for the edge function
      const products = [{
        name: collection.product_name,
        brand: collection.brand || "",
        ingredients: (ings as any[]).map((i: any) => ({
          ingredient_name: i.ingredient_name,
          source: i.source || "Unknown",
          supplier_name: i.supplier_name || "Unknown",
          is_halal_certified: false,
          percentage: i.percentage,
        })),
      }];

      const { data: result, error } = await supabase.functions.invoke("analyze-ingredients", {
        body: { products },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      // Update each ingredient with AI results
      const results = result?.results || [];
      for (const res of results) {
        const matchingIng = (ings as any[]).find((i: any) =>
          i.ingredient_name.toLowerCase() === res.ingredient_name.toLowerCase()
        );
        if (matchingIng) {
          await (supabase
            .from("supervisor_collected_ingredients" as any)
            .update({
              ai_classification: res.classification,
              ai_reasoning: res.reasoning,
              ai_risk_level: res.risk_level,
            } as any)
            .eq("id", matchingIng.id) as any);
        }
      }

      // Update collection status
      await (supabase
        .from("supervisor_ingredient_collections" as any)
        .update({ status: "analyzed" } as any)
        .eq("id", collection.id) as any);

      toast({ title: "Analysis Complete", description: `${results.length} ingredient(s) analyzed.` });
      loadCollections();

      // Refresh detail if open
      if (selectedCollection?.id === collection.id) {
        openDetail(collection);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Analysis Failed", description: error.message });
    } finally {
      setIsAnalyzing(null);
    }
  };

  const handleDecision = async (ingredientId: string, decision: string) => {
    await (supabase
      .from("supervisor_collected_ingredients" as any)
      .update({ admin_decision: decision } as any)
      .eq("id", ingredientId) as any);

    setIngredients(prev => prev.map(i => i.id === ingredientId ? { ...i, admin_decision: decision } : i));

    // Check if any flagged → update collection status
    const updated = ingredients.map(i => i.id === ingredientId ? { ...i, admin_decision: decision } : i);
    if (updated.some(i => i.admin_decision === "flagged")) {
      await (supabase
        .from("supervisor_ingredient_collections" as any)
        .update({ status: "flagged" } as any)
        .eq("id", selectedCollection.id) as any);
      loadCollections();
    }

    toast({ title: decision === "accepted" ? "Accepted" : "Flagged" });
  };

  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? collections : collections.filter((c: any) => c.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) =>
        (c.product_name || "").toLowerCase().includes(q) ||
        (c.brand || "").toLowerCase().includes(q) ||
        (c.organizations?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [collections, statusFilter, searchQuery]);

  const counts = useMemo(() => ({
    total: collections.length,
    pending: collections.filter((c: any) => c.status === "pending").length,
    analyzed: collections.filter((c: any) => c.status === "analyzed").length,
    flagged: collections.filter((c: any) => c.status === "flagged").length,
  }), [collections]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ingredient Tracker</h1>
            <p className="text-muted-foreground mt-1">AI-powered Halal/Haram ingredient analysis from supervisor collections</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: counts.total, color: "text-foreground" },
            { label: "Pending", value: counts.pending, color: "text-amber-600" },
            { label: "Analyzed", value: counts.analyzed, color: "text-blue-600" },
            { label: "Flagged", value: counts.flagged, color: "text-red-600" },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</div>
                <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product, brand, or company…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="analyzed">Analyzed</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-medium mb-1">No ingredient collections yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ingredient collections are created by supervisors during inspections.
                Once a supervisor submits a collected sample, it will appear here for AI Halal/Haram analysis.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c)}>
                    <TableCell className="text-sm">{format(new Date(c.collection_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{(c as any).organizations?.name || "—"}</TableCell>
                    <TableCell>{c.product_name}</TableCell>
                    <TableCell>{c.brand || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[c.status] || ""}`}>
                        {c.status?.charAt(0).toUpperCase() + c.status?.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={c.status === "pending" ? "default" : "outline"}
                        onClick={(e) => { e.stopPropagation(); analyzeWithAI(c); }}
                        disabled={isAnalyzing === c.id}
                      >
                        {isAnalyzing === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Brain className="mr-1 h-3 w-3" />}
                        {c.status === "pending" ? "Analyze" : "Re-analyze"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                {selectedCollection?.product_name} — Ingredients
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {ingredients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No ingredients found.</p>
              ) : (
                ingredients.map((ing: any) => {
                  const cls = classColors[ing.ai_classification] || null;
                  const Icon = cls?.icon || null;
                  return (
                    <div key={ing.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ing.ingredient_name}</span>
                          {ing.source && <span className="text-xs text-muted-foreground">({ing.source})</span>}
                          {ing.percentage && <Badge variant="outline" className="text-xs">{ing.percentage}%</Badge>}
                        </div>
                        {ing.ai_classification && Icon && (
                          <div className={`flex items-center gap-1 text-sm font-semibold ${cls.color}`}>
                            <Icon className="h-4 w-4" />
                            {ing.ai_classification.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {ing.supplier_name && <p className="text-xs text-muted-foreground">Supplier: {ing.supplier_name}</p>}
                      {ing.ai_reasoning && (
                        <p className="text-xs bg-muted p-2 rounded">{ing.ai_reasoning}</p>
                      )}
                      {ing.ai_risk_level && (
                        <Badge variant="outline" className="text-xs">Risk: {ing.ai_risk_level}</Badge>
                      )}
                      {ing.ai_classification && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant={ing.admin_decision === "accepted" ? "default" : "outline"}
                            onClick={() => handleDecision(ing.id, "accepted")}
                            className="h-7 text-xs"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant={ing.admin_decision === "flagged" ? "destructive" : "outline"}
                            onClick={() => handleDecision(ing.id, "flagged")}
                            className="h-7 text-xs"
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" /> Flag
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
