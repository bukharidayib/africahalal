import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus,
  MapPin,
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '../components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Inspector {
  id: string;
  user_id: string;
  inspector_number: string;
  is_active: boolean;
  specializations: string[] | null;
  regions: string[] | null;
  qualifications: string[] | null;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

const specializations = [
  'Food Processing',
  'Slaughterhouse',
  'Cosmetics',
  'Pharmaceuticals',
  'Logistics',
  'Retail',
];

const regions = [
  'East Africa',
  'West Africa',
  'North Africa',
  'Central Africa',
  'Southern Africa',
];

export default function Inspectors() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInspector, setNewInspector] = useState({
    email: '',
    specializations: [] as string[],
    regions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInspectors();
  }, []);

  async function fetchInspectors() {
    try {
      const { data, error } = await supabase
        .from('inspectors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = (data || []).map(i => i.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const inspectorsWithProfiles = (data || []).map(i => ({
        ...i,
        profiles: profileMap.get(i.user_id),
      })) as Inspector[];

      setInspectors(inspectorsWithProfiles);
    } catch (error) {
      console.error('Error fetching inspectors:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddInspector() {
    if (!newInspector.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (newInspector.specializations.length === 0) {
      toast.error('Please select at least one specialization');
      return;
    }

    if (newInspector.regions.length === 0) {
      toast.error('Please select at least one region');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newInspector.email.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error('User not found. They must sign up first.');
        setIsSubmitting(false);
        return;
      }

      // Check if already an inspector
      const { data: existing } = await supabase
        .from('inspectors')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (existing) {
        toast.error('This user is already an inspector.');
        setIsSubmitting(false);
        return;
      }

      // Generate inspector number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('inspectors')
        .select('*', { count: 'exact', head: true });
      const inspectorNumber = `INS-${year}-${String((count || 0) + 1).padStart(5, '0')}`;

      // Create inspector
      const { error } = await supabase
        .from('inspectors')
        .insert({
          user_id: profile.id,
          inspector_number: inspectorNumber,
          specializations: newInspector.specializations,
          regions: newInspector.regions,
          is_active: true,
        });

      if (error) throw error;

      toast.success('Inspector added successfully');
      setIsAddDialogOpen(false);
      setNewInspector({ email: '', specializations: [], regions: [] });
      fetchInspectors();
    } catch (error) {
      console.error('Error adding inspector:', error);
      toast.error('Failed to add inspector');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleInspectorStatus(inspector: Inspector) {
    try {
      const { error } = await supabase
        .from('inspectors')
        .update({ is_active: !inspector.is_active })
        .eq('id', inspector.id);

      if (error) throw error;

      toast.success(inspector.is_active ? 'Inspector deactivated' : 'Inspector activated');
      fetchInspectors();
    } catch (error) {
      console.error('Error toggling inspector status:', error);
      toast.error('Failed to update inspector status');
    }
  }

  const filteredInspectors = inspectors.filter(insp => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      insp.inspector_number.toLowerCase().includes(search) ||
      insp.profiles?.full_name.toLowerCase().includes(search) ||
      insp.profiles?.email.toLowerCase().includes(search) ||
      insp.specializations?.some(s => s.toLowerCase().includes(search)) ||
      insp.regions?.some(r => r.toLowerCase().includes(search))
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif">Inspectors</h1>
            <p className="text-muted-foreground">
              Manage field inspectors and their assignments
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Inspector
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {inspectors.filter(i => i.is_active).length}
              </div>
              <p className="text-sm text-muted-foreground">Active Inspectors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {inspectors.filter(i => !i.is_active).length}
              </div>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(inspectors.flatMap(i => i.regions || [])).size}
              </div>
              <p className="text-sm text-muted-foreground">Regions Covered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, specialization, or region..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Inspectors Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredInspectors.length} Inspector{filteredInspectors.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading inspectors...
              </div>
            ) : filteredInspectors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-1">No inspectors found</h3>
                <p className="text-sm">Add your first inspector to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Inspector #</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead>Regions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspectors.map((inspector) => (
                    <TableRow key={inspector.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inspector.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{inspector.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {inspector.inspector_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {inspector.specializations?.slice(0, 2).map((spec) => (
                            <Badge key={spec} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {(inspector.specializations?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(inspector.specializations?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {inspector.regions?.map((region) => (
                            <Badge key={region} variant="secondary" className="text-xs gap-1">
                              <MapPin className="h-3 w-3" />
                              {region}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={inspector.is_active ? 'default' : 'secondary'}>
                          {inspector.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(inspector.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleInspectorStatus(inspector)}
                            title={inspector.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {inspector.is_active ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Inspector Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inspector</DialogTitle>
            <DialogDescription>
              Register a new field inspector for site audits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="inspector@example.com"
                value={newInspector.email}
                onChange={(e) => setNewInspector({ ...newInspector, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The user must have an existing account.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec) => (
                  <Badge
                    key={spec}
                    variant={newInspector.specializations.includes(spec) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setNewInspector({
                        ...newInspector,
                        specializations: newInspector.specializations.includes(spec)
                          ? newInspector.specializations.filter(s => s !== spec)
                          : [...newInspector.specializations, spec],
                      });
                    }}
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Regions</Label>
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <Badge
                    key={region}
                    variant={newInspector.regions.includes(region) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setNewInspector({
                        ...newInspector,
                        regions: newInspector.regions.includes(region)
                          ? newInspector.regions.filter(r => r !== region)
                          : [...newInspector.regions, region],
                      });
                    }}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInspector} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Inspector'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
