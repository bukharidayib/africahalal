import React, { useState, useEffect } from "react";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Supervisor {
    id: string; // This is the UUID from auth.users or profiles
    email: string;
    full_name: string;
    organization?: {
        id: string;
        name: string;
    } | null;
}

interface Organization {
    id: string;
    name: string;
}

export default function Supervisors() {
    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
    const [selectedOrg, setSelectedOrg] = useState<string>("");
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select(`
                    id,
                    first_name,
                    last_name,
                    email,
                    organization_supervisors!supervisor_id(
                        organization:organizations(id, name)
                    )
                `);

            if (profileError) throw profileError;

            // Fetch Organizations for dropdown
            const { data: orgs, error: orgError } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name');

            if (orgError) throw orgError;

            const formattedSupervisors = profiles.map((p: any) => ({
                id: p.id,
                email: p.email,
                full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
                organization: p.organization_supervisors?.[0]?.organization || null
            }));

            setSupervisors(formattedSupervisors);
            setOrganizations(orgs || []);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedSupervisor || !selectedOrg) return;

        try {
            // Check if supervisor already has an org
            const existing = supervisors.find(s => s.id === selectedSupervisor);
            if (existing?.organization) {
                await supabase.from('organization_supervisors').delete().eq('supervisor_id', selectedSupervisor);
            }

            const { error } = await supabase.from('organization_supervisors').insert({
                supervisor_id: selectedSupervisor,
                organization_id: selectedOrg
            });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Supervisor assigned successfully"
            });
            setIsAssignOpen(false);
            fetchData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error assigning supervisor",
                description: error.message
            });
        }
    };

    const handleRemoveAssignment = async (supervisorId: string) => {
        if (!confirm("Are you sure you want to remove this assignment?")) return;
        try {
            const { error } = await supabase.from('organization_supervisors').delete().eq('supervisor_id', supervisorId);
            if (error) throw error;
            toast({ title: "Assignment removed" });
            fetchData();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Supervisors</h2>
                        <p className="text-muted-foreground">Manage supervisors and their company assignments.</p>
                    </div>
                    <Button onClick={() => setIsAssignOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign Supervisor
                    </Button>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Assigned Company</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : supervisors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        No supervisors found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                supervisors.map((supervisor) => (
                                    <TableRow key={supervisor.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{supervisor.full_name}</span>
                                                <span className="text-xs text-muted-foreground">{supervisor.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {supervisor.organization ? (
                                                <Badge variant="outline" className="gap-1">
                                                    <Building2 className="h-3 w-3" />
                                                    {supervisor.organization.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground italic text-sm">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {supervisor.organization && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveAssignment(supervisor.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Assign Supervisor</DialogTitle>
                            <DialogDescription>Select a user and a company to assign them to.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Supervisor (User)</Label>
                                <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {supervisors.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Company</Label>
                                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map(o => (
                                            <SelectItem key={o.id} value={o.id}>
                                                {o.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                            <Button onClick={handleAssign}>Assign</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
