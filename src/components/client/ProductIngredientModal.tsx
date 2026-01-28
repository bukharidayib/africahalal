import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Beaker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Ingredient {
    id: string;
    ingredient_name: string;
    percentage: number | null;
    source: string;
    is_halal_certified: boolean;
    supplier_name: string;
}

interface ProductIngredientModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productName: string;
    ingredients: Ingredient[];
    onSave: (ingredients: Ingredient[]) => void;
}

export function ProductIngredientModal({
    open,
    onOpenChange,
    productName,
    ingredients: initialIngredients,
    onSave
}: ProductIngredientModalProps) {
    const { toast } = useToast();
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
    const [newIngredient, setNewIngredient] = useState<Omit<Ingredient, 'id'>>({
        ingredient_name: "",
        percentage: null,
        source: "",
        is_halal_certified: false,
        supplier_name: ""
    });

    useEffect(() => {
        setIngredients(initialIngredients);
    }, [initialIngredients, open]);

    const handleAddIngredient = () => {
        if (!newIngredient.ingredient_name.trim()) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please enter an ingredient name."
            });
            return;
        }

        const ingredient: Ingredient = {
            id: crypto.randomUUID(),
            ...newIngredient
        };

        setIngredients(prev => [...prev, ingredient]);
        setNewIngredient({
            ingredient_name: "",
            percentage: null,
            source: "",
            is_halal_certified: false,
            supplier_name: ""
        });
    };

    const handleRemoveIngredient = (id: string) => {
        setIngredients(prev => prev.filter(i => i.id !== id));
    };

    const handleSave = () => {
        onSave(ingredients);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Beaker className="h-5 w-5" />
                        Manage Ingredients
                    </DialogTitle>
                    <DialogDescription>
                        Add ingredients for <strong>{productName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4">
                    {/* Add New Ingredient Form */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold text-sm mb-4">Add New Ingredient</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ing-name">Ingredient Name *</Label>
                                <Input
                                    id="ing-name"
                                    placeholder="e.g. Beef, Salt, Spices"
                                    value={newIngredient.ingredient_name}
                                    onChange={(e) => setNewIngredient(prev => ({ ...prev, ingredient_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ing-percentage">Percentage (%)</Label>
                                <Input
                                    id="ing-percentage"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    placeholder="e.g. 60"
                                    value={newIngredient.percentage ?? ""}
                                    onChange={(e) => setNewIngredient(prev => ({ 
                                        ...prev, 
                                        percentage: e.target.value ? parseFloat(e.target.value) : null 
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ing-source">Source/Origin</Label>
                                <Input
                                    id="ing-source"
                                    placeholder="e.g. Local Farm, Imported"
                                    value={newIngredient.source}
                                    onChange={(e) => setNewIngredient(prev => ({ ...prev, source: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ing-supplier">Supplier Name</Label>
                                <Input
                                    id="ing-supplier"
                                    placeholder="e.g. ABC Suppliers Ltd"
                                    value={newIngredient.supplier_name}
                                    onChange={(e) => setNewIngredient(prev => ({ ...prev, supplier_name: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="ing-halal"
                                    checked={newIngredient.is_halal_certified}
                                    onCheckedChange={(checked) => setNewIngredient(prev => ({ 
                                        ...prev, 
                                        is_halal_certified: checked === true 
                                    }))}
                                />
                                <Label htmlFor="ing-halal" className="text-sm cursor-pointer">
                                    Halal Certified Ingredient
                                </Label>
                            </div>
                            <Button type="button" size="sm" onClick={handleAddIngredient}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        </div>
                    </div>

                    {/* Ingredients List */}
                    <div>
                        <h4 className="font-semibold text-sm mb-3">
                            Ingredients List ({ingredients.length})
                        </h4>
                        {ingredients.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                <Beaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No ingredients added yet</p>
                                <p className="text-xs mt-1">Add ingredients using the form above</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold">Ingredient</th>
                                            <th className="px-3 py-2 text-left font-semibold">%</th>
                                            <th className="px-3 py-2 text-left font-semibold">Supplier</th>
                                            <th className="px-3 py-2 text-center font-semibold">Halal</th>
                                            <th className="px-3 py-2 text-right font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map((ing) => (
                                            <tr key={ing.id} className="border-t">
                                                <td className="px-3 py-2 font-medium">{ing.ingredient_name}</td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {ing.percentage != null ? `${ing.percentage}%` : "-"}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {ing.supplier_name || "-"}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {ing.is_halal_certified ? (
                                                        <span className="text-green-600">✓</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                                        onClick={() => handleRemoveIngredient(ing.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Ingredients
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
