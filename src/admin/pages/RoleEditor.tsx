import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useAdminAuthContext } from '../contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchAllPermissions,
  saveRolePermissions,
  fetchWorkflowStagePermissions,
  saveWorkflowStagePermissions,
  DynamicPermission,
} from '../lib/dynamicPermissions';
import { HIGH_RISK_PERMISSIONS } from '../lib/permissions';
import { WorkflowEngine, WorkflowStage } from '../lib/workflowEngine';
import { toast } from 'sonner';

interface RoleDetail {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  status?: string;
}

export default function RoleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAdminAuthContext();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [allPermissions, setAllPermissions] = useState<DynamicPermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [stagePermissions, setStagePermissions] = useState<Set<string>>(new Set()); // "stageId:permissionId"
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      // Fetch role, permissions, stages, and stage permissions in parallel
      const [roleResult, perms, stages, existingStagePerms] = await Promise.all([
        supabase.from('admin_roles').select('*').eq('id', id).single(),
        fetchAllPermissions(),
        WorkflowEngine.getWorkflowStages(),
        fetchWorkflowStagePermissions(id!),
      ]);

      if (roleResult.error) throw roleResult.error;
      setRole({ ...roleResult.data, status: (roleResult.data as any).status || 'active' });
      setAllPermissions(perms);
      setWorkflowStages(stages);

      // Fetch role's current permissions
      const { data: rolePerms, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(code)')
        .eq('role_id', id);

      if (rolePermsError) throw rolePermsError;

      const permCodes = new Set(
        (rolePerms || []).map(rp => (rp.permissions as any)?.code).filter(Boolean)
      );
      setSelectedPermissions(permCodes);

      // Build stage permission keys
      const spKeys = new Set(
        existingStagePerms.map((sp: any) => `${sp.stage_id}:${sp.permission_id}`)
      );
      setStagePermissions(spKeys);
    } catch (error) {
      console.error('Error loading role data:', error);
      toast.error('Failed to load role data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!role) return;

    setIsSaving(true);
    try {
      // Update role metadata
      const { error: updateError } = await supabase
        .from('admin_roles')
        .update({
          display_name: role.display_name,
          description: role.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', role.id);

      if (updateError) throw updateError;

      // Save permissions
      const permSuccess = await saveRolePermissions(role.id, Array.from(selectedPermissions));

      // Save workflow stage permissions
      const stagePermsArray = Array.from(stagePermissions).map(key => {
        const [stage_id, permission_id] = key.split(':');
        return { stage_id, permission_id };
      });
      const stageSuccess = await saveWorkflowStagePermissions(role.id, stagePermsArray);

      if (permSuccess && stageSuccess) {
        await supabase.rpc('log_audit', {
          _action: 'role_permissions_updated',
          _resource_type: 'admin_roles',
          _resource_id: role.id,
          _reason_code: 'admin_action',
          _metadata: {
            role_name: role.display_name,
            permission_count: selectedPermissions.size,
            stage_permission_count: stagePermissions.size,
          },
        });
        toast.success('Role updated successfully');
        navigate('/admin/roles');
      } else {
        toast.error('Failed to update some permissions');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setIsSaving(false);
    }
  }

  function togglePermission(code: string) {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  function toggleCategory(category: string) {
    const categoryPerms = allPermissions.filter(p => p.category === category);
    const allSelected = categoryPerms.every(p => selectedPermissions.has(p.code));

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      categoryPerms.forEach(p => {
        if (allSelected) {
          next.delete(p.code);
        } else {
          next.add(p.code);
        }
      });
      return next;
    });
  }

  function toggleStagePermission(stageId: string, permissionId: string) {
    const key = `${stageId}:${permissionId}`;
    setStagePermissions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Group permissions by category
  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, DynamicPermission[]>);

  const isHighRisk = (code: string) => HIGH_RISK_PERMISSIONS.includes(code);

  if (!permissions.canManageUsers) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to edit roles.</p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-muted-foreground">Loading role...</div>
      </AdminLayout>
    );
  }

  if (!role) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">Role Not Found</h2>
          <Button asChild variant="outline">
            <Link to="/admin/roles">Back to Roles</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/admin/roles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-serif">Edit Role</h1>
              {role.is_system_role && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">System Role</Badge>
              )}
              {role.status === 'suspended' && (
                <Badge variant="destructive">Suspended</Badge>
              )}
            </div>
            <p className="text-muted-foreground">Configure permissions for {role.display_name}</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Role Details */}
        <Card>
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={role.display_name}
                  onChange={(e) => setRole({ ...role, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">System Code</Label>
                <Input id="name" value={role.name} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={role.description || ''}
                onChange={(e) => setRole({ ...role, description: e.target.value })}
                placeholder="Describe the role's responsibilities..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Permissions + Workflow Stages */}
        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="permissions">
              Permissions ({selectedPermissions.size}/{allPermissions.length})
            </TabsTrigger>
            <TabsTrigger value="workflow">
              Workflow Stages ({stagePermissions.size})
            </TabsTrigger>
          </TabsList>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Select permissions by module. <AlertTriangle className="inline h-3 w-3 text-amber-500" /> marks high-risk permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => {
                      const allSelected = perms.every(p => selectedPermissions.has(p.code));
                      const someSelected = perms.some(p => selectedPermissions.has(p.code));

                      return (
                        <div key={category} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`cat-${category}`}
                              checked={allSelected}
                              onCheckedChange={() => toggleCategory(category)}
                              className={someSelected && !allSelected ? 'opacity-50' : ''}
                            />
                            <Label htmlFor={`cat-${category}`} className="text-sm font-semibold cursor-pointer">
                              {category}
                            </Label>
                            <Badge variant="secondary" className="ml-auto">
                              {perms.filter(p => selectedPermissions.has(p.code)).length}/{perms.length}
                            </Badge>
                          </div>
                          <Separator />
                          <div className="space-y-2 pl-2">
                            {perms.map((perm) => (
                              <div key={perm.code} className="flex items-center gap-2">
                                <Checkbox
                                  id={perm.code}
                                  checked={selectedPermissions.has(perm.code)}
                                  onCheckedChange={() => togglePermission(perm.code)}
                                />
                                <Label htmlFor={perm.code} className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                                  {perm.name}
                                  {isHighRisk(perm.code) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs max-w-[200px]">
                                          High-risk permission. Grants access to sensitive operations.
                                          Assign with caution.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </Label>
                                <code className="text-[10px] bg-muted px-1 rounded ml-auto hidden lg:block">
                                  {perm.code}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow Stages Tab */}
          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Stage Assignments</CardTitle>
                <CardDescription>
                  Define which permissions this role can exercise at each certification workflow stage.
                  Only permissions already selected above will have effect.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workflowStages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No workflow stages configured.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {workflowStages.map((stage) => {
                      // Get permissions relevant to this stage
                      const relevantPerms = allPermissions.filter(p =>
                        selectedPermissions.has(p.code)
                      );
                      const stageCount = relevantPerms.filter(p =>
                        stagePermissions.has(`${stage.id}:${p.id}`)
                      ).length;

                      return (
                        <div key={stage.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  Stage {stage.stage_order}
                                </Badge>
                                <h4 className="font-semibold">{stage.display_name}</h4>
                              </div>
                              {stage.description && (
                                <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>
                              )}
                            </div>
                            <Badge variant="secondary">{stageCount} assigned</Badge>
                          </div>
                          <Separator />
                          {relevantPerms.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              Select permissions in the Permissions tab first.
                            </p>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                              {relevantPerms.map((perm) => (
                                <div key={`${stage.id}-${perm.id}`} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`stage-${stage.id}-${perm.id}`}
                                    checked={stagePermissions.has(`${stage.id}:${perm.id}`)}
                                    onCheckedChange={() => toggleStagePermission(stage.id, perm.id!)}
                                  />
                                  <Label
                                    htmlFor={`stage-${stage.id}-${perm.id}`}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {perm.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
