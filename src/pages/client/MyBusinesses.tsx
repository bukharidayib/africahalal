import { useState, useEffect } from "react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

interface Business {
    id: string;
    entity_name: string;
    pacra_number: string;
    created_at: string;
}

export default function MyBusinesses() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editBiz, setEditBiz] = useState<Business | null>(null);
    const [deleteBiz, setDeleteBiz] = useState<Business | null>(null);
    const [form, setForm] = useState({ entity_name: "", pacra_number: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => { fetchBusinesses(); }, []);

    const fetchBusinesses = async () => {
        try {
            const { data, error } = await supabase.from('client_businesses')
                .select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setBusinesses(data || []);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally { setIsLoading(false); }
    };

    const handleAdd = async () => {
        if (!form.entity_name || !form.pacra_number) {
            toast({ variant: "destructive", title: "Missing fields", description: "Please fill all fields." });
            return;
        }
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");
            const { error } = await supabase.from('client_businesses').insert({
                user_id: user.id,
                entity_name: form.entity_name,
                pacra_number: form.pacra_number,
            });
            if (error) throw error;
            toast({ title: "Business Added", description: `${form.entity_name} has been registered.` });
            setShowAdd(false);
            setForm({ entity_name: "", pacra_number: "" });
            fetchBusinesses();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally { setIsSaving(false); }
    };

    const handleOpenEdit = (biz: Business) => {
        setEditBiz(biz);
        setForm({ entity_name: biz.entity_name, pacra_number: biz.pacra_number });
    };

    const handleSaveEdit = async () => {
        if (!editBiz || !form.entity_name || !form.pacra_number) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('client_businesses')
                .update({ entity_name: form.entity_name, pacra_number: form.pacra_number })
                .eq('id', editBiz.id);
            if (error) throw error;
            toast({ title: "Updated", description: "Business details updated." });
            setEditBiz(null);
            setForm({ entity_name: "", pacra_number: "" });
            fetchBusinesses();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteBiz) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('client_businesses').delete().eq('id', deleteBiz.id);
            if (error) throw error;
            toast({ title: "Deleted", description: `${deleteBiz.entity_name} has been removed.` });
            setDeleteBiz(null);
            fetchBusinesses();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally { setIsDeleting(false); }
    };

    return (
        <ClientLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-serif">My Businesses</h1>
                        <p className="text-muted-foreground">Register and manage your business entities for certification applications.</p>
                    </div>
                    <Button onClick={() => { setForm({ entity_name: "", pacra_number: "" }); setShowAdd(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Business
                    </Button>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : businesses.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
                                <p className="text-muted-foreground">No businesses registered yet.</p>
                                <Button variant="outline" onClick={() => setShowAdd(true)}><Plus className="mr-2 h-4 w-4" /> Register Your First Business</Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Entity Name</TableHead>
                                        <TableHead>PACRA Number</TableHead>
                                        <TableHead>Registered</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {businesses.map((biz) => (
                                        <TableRow key={biz.id}>
                                            <TableCell className="font-medium">{biz.entity_name}</TableCell>
                                            <TableCell className="font-mono text-sm">{biz.pacra_number}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{new Date(biz.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(biz)}><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteBiz(biz)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Add Dialog */}
                <Dialog open={showAdd} onOpenChange={setShowAdd}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Register Business</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Business Entity Name *</Label>
                                <Input placeholder="e.g. Global Foods Ltd" value={form.entity_name} onChange={(e) => setForm(p => ({ ...p, entity_name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>PACRA Registration Number *</Label>
                                <Input placeholder="e.g. 120230012345" value={form.pacra_number} onChange={(e) => setForm(p => ({ ...p, pacra_number: e.target.value }))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleAdd} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Register Business
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={!!editBiz} onOpenChange={(open) => !open && setEditBiz(null)}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Edit Business</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Business Entity Name *</Label>
                                <Input value={form.entity_name} onChange={(e) => setForm(p => ({ ...p, entity_name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>PACRA Registration Number *</Label>
                                <Input value={form.pacra_number} onChange={(e) => setForm(p => ({ ...p, pacra_number: e.target.value }))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditBiz(null)}>Cancel</Button>
                            <Button onClick={handleSaveEdit} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation */}
                <AlertDialog open={!!deleteBiz} onOpenChange={(open) => !open && setDeleteBiz(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Business</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete <span className="font-semibold">{deleteBiz?.entity_name}</span>? This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </ClientLayout>
    );
}
