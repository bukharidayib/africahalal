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

interface AssignedCompany {
  id: string;
  organization_id: string;
  organizations?: {
    id: string;
    name: string | null;
  } | null;
}

export default function SupervisorIngredientForm() {
  const [companies, setCompanies] = useState<AssignedCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
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
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await (supabase
        .from("organization_supervisors" as any)
        .select("id, organization_id, organizations(id, name)")
        .eq("supervisor_id", session.user.id) as any);

      if (error) {
        toast({ variant: "destructive", title: "Unable to load companies", description: error.message });
        setIsLoading(false);
        return;
      }

      const assignedCompanies = ((data as AssignedCompany[]) || []).filter((company) => Boolean(company.organization_id));
      setCompanies(assignedCompanies);
      if (assignedCompanies.length === 1) setSelectedCompanyId(assignedCompanies[0].organization_id);
      setIsLoading(false);
    }
    load();
  }, [toast]);

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
    if (!selectedCompanyId || !productName.trim()) {
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

      const selectedCompany = companies.find((company) => company.organization_id === selectedCompanyId);
      const orgId = selectedCompany?.organization_id;
      const orgName = selectedCompany?.organizations?.name || "Assigned Company";

      if (!orgId) {
        throw new Error("Could not resolve organization for the selected company.");
      }

      const invalidPercentage = validIngredients.find((ingredient) => {
        if (!ingredient.percentage) return false;
        const value = Number(ingredient.percentage);
        return Number.isNaN(value) || value < 0 || value > 100;
      });

      if (invalidPercentage) {
        throw new Error("Ingredient percentage must be a number between 0 and 100.");
      }

      const { data: siteId, error: siteRpcError } = await (supabase.rpc("ensure_supervisor_site" as any, {
        _organization_id: orgId,
        _site_name: orgName,
      } as any) as any);

      if (siteRpcError) throw siteRpcError;
      if (!siteId) throw new Error("Could not resolve supervisor site for the selected company.");

      const { data: collection, error: colError } = await (supabase
        .from("supervisor_ingredient_collections" as any)
        .insert({
          supervisor_id: session.user.id,
          site_id: siteId,
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
        ingredient_name: i.ingredient_name.trim(),
        source: i.source || null,
        supplier_name: i.supplier_name || null,
        percentage: i.percentage ? Number(i.percentage) : null,
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
                {companies.length <= 1 ? (
                  <Input value={companies[0]?.organizations?.name || "No company assigned"} disabled className="bg-muted" />
                ) : (
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.organization_id}>{company.organizations?.name || "Assigned Company"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {companies.length === 0 && <p className="text-xs text-destructive">No assigned business found for your supervisor account.</p>}
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
          <Button onClick={handleSubmit} disabled={isSubmitting || companies.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Collection
          </Button>
        </div>
      </div>
    </SupervisorLayout>
  );
}
