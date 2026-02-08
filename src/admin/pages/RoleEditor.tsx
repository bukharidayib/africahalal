import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield, AlertTriangle, Info, ChevronDown, ChevronRight, Check } from 'lucide-react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { HIGH_RISK_PERMISSIONS, PERMISSION_MODULES } from '../lib/permissions';
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

interface ModulePermissions {
  category: string;
  create?: DynamicPermission;
  read?: DynamicPermission;
  update?: DynamicPermission;
  delete?: DynamicPermission;
  specials: DynamicPermission[];
  all: DynamicPermission[];
}

export default function RoleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAdminAuthContext();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [allPermissions, setAllPermissions] = useState<DynamicPermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [stagePermissions, setStagePermissions] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    try {
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

      const { data: rolePerms, error: rolePermsError } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(code)')
        .eq('role_id', id);

      if (rolePermsError) throw rolePermsError;

      const permCodes = new Set(
        (rolePerms || []).map(rp => (rp.permissions as any)?.code).filter(Boolean)
      );
      setSelectedPermissions(permCodes);

      const spKeys = new Set(
        existingStagePerms.map((sp: any) => `${sp.stage_id}:${sp.permission_id}`)
      );
      setStagePermissions(spKeys);

      // Expand all modules by default
      const categories = new Set(perms.map(p => p.category));
      setExpandedModules(categories);
    } catch (error) {
      console.error('Error loading role data:', error);
      toast.error('Failed to load role data');
    } finally {
      setIsLoading(false);
    }
  }

  // Group permissions into module CRUD structure
  const modules: ModulePermissions[] = useMemo(() => {
    const grouped: Record<string, DynamicPermission[]> = {};
    allPermissions.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    // Sort modules by PERMISSION_MODULES order
    const moduleOrder = Object.keys(PERMISSION_MODULES);
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const ia = moduleOrder.indexOf(a);
      const ib = moduleOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sortedCategories.map(category => {
      const perms = grouped[category];
      const actionType = (p: DynamicPermission) => p.action_type || inferActionType(p.code);

      return {
        category,
        create: perms.find(p => actionType(p) === 'create'),
        read: perms.find(p => actionType(p) === 'read'),
        update: perms.find(p => actionType(p) === 'update'),
        delete: perms.find(p => actionType(p) === 'delete'),
        specials: perms.filter(p => actionType(p) === 'special'),
        all: perms,
      };
    });
  }, [allPermissions]);

  function inferActionType(code: string): string {
    const action = code.split('.')[1];
    if (!action) return 'special';
    if (action === 'view') return 'read';
    if (action === 'create') return 'create';
    if (action === 'update') return 'update';
    if (action === 'delete') return 'delete';
    return 'special';
  }

  async function handleSave() {
    if (!role) return;

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('admin_roles')
        .update({
          display_name: role.display_name,
          description: role.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', role.id);

      if (updateError) throw updateError;

      const permSuccess = await saveRolePermissions(role.id, Array.from(selectedPermissions));

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
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleModuleAll(module: ModulePermissions) {
    const allCodes = module.all.map(p => p.code);
    const allSelected = allCodes.every(c => selectedPermissions.has(c));

    setSelectedPermissions(prev => {
      const next = new Set(prev);
      allCodes.forEach(c => {
        if (allSelected) next.delete(c);
        else next.add(c);
      });
      return next;
    });
  }

  function toggleExpandModule(category: string) {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleStagePermission(stageId: string, permissionId: string) {
    const key = `${stageId}:${permissionId}`;
    setStagePermissions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isHighRisk = (code: string) => HIGH_RISK_PERMISSIONS.includes(code);

  function getSpecialLabel(code: string): string {
    const action = code.split('.')[1];
    if (!action) return code;
    return action
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  if (!permissions.canManageUsers && !permissions.canManageRoles) {
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

          {/* CRUD Permission Matrix Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Configure CRUD and special permissions per module. <AlertTriangle className="inline h-3 w-3 text-amber-500" /> marks high-risk permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="border rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_80px] gap-0 bg-muted/50 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
                      <div>Module</div>
                      <div className="text-center">Create</div>
                      <div className="text-center">Read</div>
                      <div className="text-center">Update</div>
                      <div className="text-center">Delete</div>
                      <div>Extra Actions</div>
                      <div className="text-center">All</div>
                    </div>

                    {/* Module Rows */}
                    {modules.map((mod) => {
                      const selectedCount = mod.all.filter(p => selectedPermissions.has(p.code)).length;
                      const totalCount = mod.all.length;
                      const allSelected = totalCount > 0 && selectedCount === totalCount;
                      const isExpanded = expandedModules.has(mod.category);
                      const moduleConfig = PERMISSION_MODULES[mod.category];

                      return (
                        <Collapsible
                          key={mod.category}
                          open={isExpanded}
                          onOpenChange={() => toggleExpandModule(mod.category)}
                        >
                          {/* Module Row */}
                          <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_80px] gap-0 items-center px-4 py-3 border-b transition-colors hover:bg-muted/30 ${selectedCount > 0 ? 'bg-primary/5' : ''}`}>
                            {/* Module Name */}
                            <CollapsibleTrigger asChild>
                              <button className="flex items-center gap-2 text-left font-medium text-sm group">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span>{moduleConfig?.label || mod.category}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {selectedCount}/{totalCount}
                                </Badge>
                              </button>
                            </CollapsibleTrigger>

                            {/* CRUD Checkboxes */}
                            <div className="flex justify-center">
                              {mod.create ? (
                                <Checkbox
                                  checked={selectedPermissions.has(mod.create.code)}
                                  onCheckedChange={() => togglePermission(mod.create!.code)}
                                />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </div>
                            <div className="flex justify-center">
                              {mod.read ? (
                                <Checkbox
                                  checked={selectedPermissions.has(mod.read.code)}
                                  onCheckedChange={() => togglePermission(mod.read!.code)}
                                />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </div>
                            <div className="flex justify-center">
                              {mod.update ? (
                                <Checkbox
                                  checked={selectedPermissions.has(mod.update.code)}
                                  onCheckedChange={() => togglePermission(mod.update!.code)}
                                />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </div>
                            <div className="flex justify-center">
                              {mod.delete ? (
                                <Checkbox
                                  checked={selectedPermissions.has(mod.delete.code)}
                                  onCheckedChange={() => togglePermission(mod.delete!.code)}
                                />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </div>

                            {/* Extra Actions Preview */}
                            <div className="flex flex-wrap gap-1">
                              {mod.specials.slice(0, 3).map(sp => (
                                <div key={sp.code} className="flex items-center gap-1">
                                  <Checkbox
                                    id={`inline-${sp.code}`}
                                    checked={selectedPermissions.has(sp.code)}
                                    onCheckedChange={() => togglePermission(sp.code)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <label
                                    htmlFor={`inline-${sp.code}`}
                                    className="text-xs cursor-pointer flex items-center gap-0.5"
                                  >
                                    {getSpecialLabel(sp.code)}
                                    {isHighRisk(sp.code) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs max-w-[200px]">
                                            High-risk permission. Grants access to sensitive operations.
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </label>
                                </div>
                              ))}
                              {mod.specials.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{mod.specials.length - 3} more</span>
                              )}
                            </div>

                            {/* Select All */}
                            <div className="flex justify-center">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => toggleModuleAll(mod)}
                                className={selectedCount > 0 && !allSelected ? 'opacity-50' : ''}
                              />
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <CollapsibleContent>
                            <div className="bg-muted/20 border-b px-8 py-4 space-y-3">
                              {/* CRUD permissions detail */}
                              {[mod.create, mod.read, mod.update, mod.delete].filter(Boolean).map(perm => (
                                <div key={perm!.code} className="flex items-center gap-3 text-sm">
                                  <Checkbox
                                    id={`detail-${perm!.code}`}
                                    checked={selectedPermissions.has(perm!.code)}
                                    onCheckedChange={() => togglePermission(perm!.code)}
                                  />
                                  <label htmlFor={`detail-${perm!.code}`} className="cursor-pointer flex items-center gap-2 flex-1">
                                    <span className="font-medium">{perm!.name}</span>
                                    {isHighRisk(perm!.code) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">High-risk permission</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </label>
                                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{perm!.code}</code>
                                  {perm!.description && (
                                    <span className="text-xs text-muted-foreground hidden lg:inline">{perm!.description}</span>
                                  )}
                                </div>
                              ))}

                              {/* Special permissions detail */}
                              {mod.specials.length > 0 && (
                                <>
                                  <Separator className="my-2" />
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extra Actions</p>
                                  {mod.specials.map(perm => (
                                    <div key={perm.code} className="flex items-center gap-3 text-sm">
                                      <Checkbox
                                        id={`detail-${perm.code}`}
                                        checked={selectedPermissions.has(perm.code)}
                                        onCheckedChange={() => togglePermission(perm.code)}
                                      />
                                      <label htmlFor={`detail-${perm.code}`} className="cursor-pointer flex items-center gap-2 flex-1">
                                        <span className="font-medium">{perm.name}</span>
                                        {isHighRisk(perm.code) && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">High-risk permission. Assign with caution.</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </label>
                                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{perm.code}</code>
                                      {perm.description && (
                                        <span className="text-xs text-muted-foreground hidden lg:inline">{perm.description}</span>
                                      )}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
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
