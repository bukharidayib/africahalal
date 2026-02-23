import { useState, useEffect } from "react";
import { SupervisorLayout } from "@/components/layout/SupervisorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2, Send } from "lucide-react";

interface IngredientRow {
  id: string;
  ingredient_name: string;
  source: string;
  supplier_name: string;
  percentage: string;
  notes: string;
}

export default function SupervisorIngredientForm() {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { id: "1", ingredient_name: "", source: "", supplier_name: "", percentage: "", notes: "" },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await (supabase
        .from("organization_supervisors" as any)
        .select("*, organizations(name, id)")
        .eq("supervisor_id", session.user.id) as any);
      const siteList = (data as any[]) || [];
      setSites(siteList);
      if (siteList.length === 1) setSelectedSite(siteList[0].organization_id);
      setIsLoading(false);
    }
    load();
  }, []);

  const addRow = () => {
    setIngredients(prev => [...prev, {
      id: Date.now().toString(),
      ingredient_name: "", source: "", supplier_name: "", percentage: "", notes: "",
    }]);
  };

  const removeRow = (id: string) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof IngredientRow, value: string) => {
    setIngredients(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    if (!selectedSite || !productName.trim()) {
      toast({ variant: "destructive", title: "Incomplete", description: "Company and product name are required." });
      return;
    }
    const validIngredients = ingredients.filter(i => i.ingredient_name.trim());
    if (validIngredients.length === 0) {
      toast({ variant: "destructive", title: "No Ingredients", description: "Add at least one ingredient." });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const siteObj = sites.find((s: any) => s.id === selectedSite);
      const orgId = siteObj?.organization_id || siteObj?.organizations?.id;

      const { data: collection, error: colError } = await (supabase
        .from("supervisor_ingredient_collections" as any)
        .insert({
          supervisor_id: session.user.id,
          site_id: selectedSite,
          organization_id: orgId,
          product_name: productName,
          brand: brand || null,
          notes: notes || null,
        } as any)
        .select()
        .single() as any);

      if (colError) throw colError;

      const ingredientRows = validIngredients.map(i => ({
        collection_id: (collection as any).id,
        ingredient_name: i.ingredient_name,
        source: i.source || null,
        supplier_name: i.supplier_name || null,
        percentage: i.percentage ? parseFloat(i.percentage) : null,
        notes: i.notes || null,
      }));

      const { error: ingError } = await (supabase
        .from("supervisor_collected_ingredients" as any)
        .insert(ingredientRows as any) as any);

      if (ingError) throw ingError;

      // Log activity
      await supabase.rpc("log_supervisor_activity" as any, {
        _supervisor_id: session.user.id,
        _action: "ingredients_collected",
        _resource_type: "supervisor_ingredient_collections",
        _resource_id: (collection as any).id,
        _metadata: { product_name: productName, ingredient_count: validIngredients.length },
      } as any);

      toast({ title: "Ingredients Submitted", description: `${validIngredients.length} ingredient(s) logged for ${productName}.` });
      navigate("/supervisor/ingredients");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SupervisorLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></SupervisorLayout>;
  }

  return (
    <SupervisorLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold font-serif">Collect Ingredients</h1>
          <p className="text-muted-foreground mt-1">Log product ingredients from your assigned company</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Company *</Label>
                {sites.length <= 1 ? (
                  <Input value={sites[0]?.organizations?.name || "No company assigned"} disabled className="bg-muted" />
                ) : (
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {sites.map((s: any) => (
                        <SelectItem key={s.id} value={s.organization_id}>{s.organizations?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Chicken Sausages" />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. FreshMeats Co." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Ingredients</Label>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-3 w-3" /> Add Ingredient
              </Button>
            </div>

            {ingredients.map((ing, idx) => (
              <div key={ing.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                  {ingredients.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(ing.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Ingredient Name *</Label>
                    <Input value={ing.ingredient_name} onChange={(e) => updateRow(ing.id, "ingredient_name", e.target.value)} placeholder="e.g. Gelatin" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Source</Label>
                    <Input value={ing.source} onChange={(e) => updateRow(ing.id, "source", e.target.value)} placeholder="e.g. Bovine" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Supplier</Label>
                    <Input value={ing.supplier_name} onChange={(e) => updateRow(ing.id, "supplier_name", e.target.value)} placeholder="e.g. ABC Suppliers" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Percentage (%)</Label>
                    <Input type="number" value={ing.percentage} onChange={(e) => updateRow(ing.id, "percentage", e.target.value)} placeholder="e.g. 5" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input value={ing.notes} onChange={(e) => updateRow(ing.id, "notes", e.target.value)} placeholder="Optional notes about this ingredient" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Label>Additional Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes about this collection..." rows={3} className="mt-2" />
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Collection
          </Button>
        </div>
      </div>
    </SupervisorLayout>
  );
}
