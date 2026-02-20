import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Shield, AlertTriangle, Info,
  FileText, FolderOpen, ClipboardList, DollarSign, Award,
  MessageSquare, Users, ScrollText, BarChart3, Settings,
  UserCheck, CheckSquare, XSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const MODULE_ICONS: Record<string, React.ReactNode> = {
  'FileText': <FileText className="h-4 w-4" />,
  'FolderOpen': <FolderOpen className="h-4 w-4" />,
  'ClipboardList': <ClipboardList className="h-4 w-4" />,
  'DollarSign': <DollarSign className="h-4 w-4" />,
  'Award': <Award className="h-4 w-4" />,
  'AlertTriangle': <AlertTriangle className="h-4 w-4" />,
  'MessageSquare': <MessageSquare className="h-4 w-4" />,
  'Users': <Users className="h-4 w-4" />,
  'Shield': <Shield className="h-4 w-4" />,
  'ScrollText': <ScrollText className="h-4 w-4" />,
  'BarChart3': <BarChart3 className="h-4 w-4" />,
  'UserCheck': <UserCheck className="h-4 w-4" />,
  'Settings': <Settings className="h-4 w-4" />,
};

function inferActionType(code: string): string {
  const action = code.split('.')[1];
  if (!action) return 'special';
  if (action === 'view') return 'read';
  if (action === 'create') return 'create';
  if (action === 'update') return 'update';
  if (action === 'delete') return 'delete';
  return 'special';
}

function getSpecialLabel(code: string): string {
  const action = code.split('.')[1];
  if (!action) return code;
  return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

    const moduleOrder = Object.keys(PERMISSION_MODULES);
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const ia = moduleOrder.indexOf(a);
      const ib = moduleOrder.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sortedCategories.map(category => {
      const perms = grouped[category];
      const getActionType = (p: DynamicPermission) => p.action_type || inferActionType(p.code);
      return {
        category,
        create: perms.find(p => getActionType(p) === 'create'),
        read: perms.find(p => getActionType(p) === 'read'),
        update: perms.find(p => getActionType(p) === 'update'),
        delete: perms.find(p => getActionType(p) === 'delete'),
        specials: perms.filter(p => getActionType(p) === 'special'),
        all: perms,
      };
    });
  }, [allPermissions]);

  async function handleSave() {
    if (!role) return;
    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('admin_roles')
        .update({ display_name: role.display_name, description: role.description, updated_at: new Date().toISOString() })
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
          _metadata: { role_name: role.display_name, permission_count: selectedPermissions.size, stage_permission_count: stagePermissions.size },
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

  function selectAllInModule(mod: ModulePermissions) {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      mod.all.forEach(p => next.add(p.code));
      return next;
    });
  }

  function clearAllInModule(mod: ModulePermissions) {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      mod.all.forEach(p => next.delete(p.code));
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

  function assignAllAtStage(stageId: string, perms: DynamicPermission[]) {
    setStagePermissions(prev => {
      const next = new Set(prev);
      perms.forEach(p => next.add(`${stageId}:${p.id}`));
      return next;
    });
  }

  function clearAllAtStage(stageId: string, perms: DynamicPermission[]) {
    setStagePermissions(prev => {
      const next = new Set(prev);
      perms.forEach(p => next.delete(`${stageId}:${p.id}`));
      return next;
    });
  }

  const isHighRisk = (code: string) => HIGH_RISK_PERMISSIONS.includes(code);

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
          <Button asChild variant="outline"><Link to="/admin/roles">Back to Roles</Link></Button>
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
            <Link to="/admin/roles"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-serif">Edit Role</h1>
              {role.status === 'suspended' && <Badge variant="destructive">Suspended</Badge>}
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
          <CardHeader><CardTitle>Role Details</CardTitle></CardHeader>
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

        {/* Tabs */}
        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="permissions">
              Permissions ({selectedPermissions.size}/{allPermissions.length})
            </TabsTrigger>
            <TabsTrigger value="workflow">
              Workflow Stages ({stagePermissions.size})
            </TabsTrigger>
          </TabsList>

          {/* ─── PERMISSION MATRIX TAB ─── */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Grant or revoke permissions per module. Use <strong>Select All</strong> to grant everything in a module at once.
                  <span className="inline-flex items-center gap-1 ml-2 text-warning">
                    <AlertTriangle className="h-3 w-3" /> High-risk permissions are flagged.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="grid gap-4">
                    {modules.map((mod) => {
                      const selectedCount = mod.all.filter(p => selectedPermissions.has(p.code)).length;
                      const totalCount = mod.all.length;
                      const allSelected = totalCount > 0 && selectedCount === totalCount;
                      const moduleConfig = PERMISSION_MODULES[mod.category];
                      const hasAny = selectedCount > 0;

                      return (
                        <div
                          key={mod.category}
                          className={`border rounded-xl overflow-hidden transition-all ${hasAny ? 'border-primary/40 shadow-sm' : 'border-border'}`}
                        >
                          {/* Module Header */}
                          <div className={`flex items-start justify-between px-5 py-4 ${hasAny ? 'bg-primary/5' : 'bg-muted/30'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${hasAny ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {MODULE_ICONS[moduleConfig?.icon] || <FileText className="h-4 w-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{moduleConfig?.label || mod.category}</span>
                                  <Badge variant={hasAny ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                    {selectedCount}/{totalCount}
                                  </Badge>
                                </div>
                                {moduleConfig?.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{moduleConfig.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => selectAllInModule(mod)}
                                disabled={allSelected}
                              >
                                <CheckSquare className="h-3 w-3 mr-1" />
                                Select All
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => clearAllInModule(mod)}
                                disabled={selectedCount === 0}
                              >
                                <XSquare className="h-3 w-3 mr-1" />
                                Clear
                              </Button>
                            </div>
                          </div>

                          {/* Permissions Body */}
                          <div className="px-5 py-4 bg-card">
                            <div className="grid gap-4 sm:grid-cols-2">
                              {/* Standard Actions */}
                              {[
                                { label: 'View', perm: mod.read },
                                { label: 'Create', perm: mod.create },
                                { label: 'Update', perm: mod.update },
                                { label: 'Delete', perm: mod.delete },
                              ].filter(item => item.perm).map(({ label, perm }) => (
                                <label
                                  key={perm!.code}
                                  className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:bg-muted/50 cursor-pointer group"
                                >
                                  <Checkbox
                                    checked={selectedPermissions.has(perm!.code)}
                                    onCheckedChange={() => togglePermission(perm!.code)}
                                  />
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-medium">{label}</span>
                                    <span className="text-xs text-muted-foreground truncate">{perm!.name}</span>
                                    {isHighRisk(perm!.code) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                           <span className="inline-flex items-center gap-0.5 bg-warning-subtle text-warning-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0">
                                            <AlertTriangle className="h-2.5 w-2.5" /> High Risk
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs max-w-[200px]">High-risk permission. Grants access to sensitive operations.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </label>
                              ))}

                              {/* Special Actions */}
                              {mod.specials.map(sp => (
                                <label
                                  key={sp.code}
                                  className="flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:bg-muted/50 cursor-pointer group"
                                >
                                  <Checkbox
                                    checked={selectedPermissions.has(sp.code)}
                                    onCheckedChange={() => togglePermission(sp.code)}
                                  />
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-medium">{getSpecialLabel(sp.code)}</span>
                                    {sp.name && sp.name !== getSpecialLabel(sp.code) && (
                                      <span className="text-xs text-muted-foreground truncate">{sp.name}</span>
                                    )}
                                    {isHighRisk(sp.code) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center gap-0.5 bg-warning-subtle text-warning-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0">
                                            <AlertTriangle className="h-2.5 w-2.5" /> High Risk
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs max-w-[200px]">High-risk permission. Assign with caution.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </label>
                              ))}

                              {/* Empty state */}
                              {mod.all.length === 0 && (
                                <p className="text-sm text-muted-foreground italic col-span-2">No permissions in this module.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── WORKFLOW STAGES TAB ─── */}
          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Stage Assignments</CardTitle>
                <CardDescription>
                  Choose which permissions this role can use at each stage of the certification process.
                  Only permissions enabled in the <strong>Permissions tab</strong> will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workflowStages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No workflow stages configured.</p>
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-border hidden md:block" />

                    {workflowStages.map((stage, index) => {
                      const rolePerms = allPermissions.filter(p => selectedPermissions.has(p.code));
                      const stageCount = rolePerms.filter(p => stagePermissions.has(`${stage.id}:${p.id}`)).length;
                      const hasPerms = rolePerms.length > 0;

                      // Group role's permissions by category for this stage
                      const permsByCategory: Record<string, DynamicPermission[]> = {};
                      rolePerms.forEach(p => {
                        if (!permsByCategory[p.category]) permsByCategory[p.category] = [];
                        permsByCategory[p.category].push(p);
                      });

                      return (
                        <div key={stage.id} className="relative flex gap-6 pb-6">
                          {/* Timeline node */}
                          <div className="relative z-10 shrink-0 hidden md:flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${stageCount > 0 ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground'}`}>
                              {index + 1}
                            </div>
                          </div>

                          {/* Stage Card */}
                          <div className="flex-1 border rounded-xl overflow-hidden">
                            {/* Stage Header */}
                            <div className={`flex items-start justify-between px-5 py-4 ${stageCount > 0 ? 'bg-primary/5' : 'bg-muted/30'}`}>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="font-mono text-xs md:hidden">#{index + 1}</Badge>
                                  <h4 className="font-semibold text-sm">{stage.display_name}</h4>
                                  <Badge variant={stageCount > 0 ? 'default' : 'secondary'} className="text-[10px]">
                                    {stageCount} permission{stageCount !== 1 ? 's' : ''} assigned
                                  </Badge>
                                </div>
                                {stage.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                                )}
                              </div>
                              {hasPerms && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => assignAllAtStage(stage.id, rolePerms)}
                                    disabled={stageCount === rolePerms.length}
                                  >
                                    <CheckSquare className="h-3 w-3 mr-1" />
                                    Assign All
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground"
                                    onClick={() => clearAllAtStage(stage.id, rolePerms)}
                                    disabled={stageCount === 0}
                                  >
                                    <XSquare className="h-3 w-3 mr-1" />
                                    Clear
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Permissions Body */}
                            <div className="px-5 py-4 bg-card">
                              {!hasPerms ? (
                                <div className="flex items-start gap-2 text-muted-foreground text-sm">
                                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>No permissions selected yet. Go to the <strong>Permissions</strong> tab to grant this role permissions first.</span>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {Object.entries(permsByCategory).map(([category, perms]) => {
                                    const moduleConfig = PERMISSION_MODULES[category];
                                    return (
                                      <div key={category}>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-muted-foreground">
                                            {MODULE_ICONS[moduleConfig?.icon] || <FileText className="h-3.5 w-3.5" />}
                                          </span>
                                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            {moduleConfig?.label || category}
                                          </span>
                                        </div>
                                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 pl-1">
                                          {perms.map(perm => (
                                            <label
                                              key={`${stage.id}-${perm.id}`}
                                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                                            >
                                              <Checkbox
                                                id={`stage-${stage.id}-${perm.id}`}
                                                checked={stagePermissions.has(`${stage.id}:${perm.id}`)}
                                                onCheckedChange={() => toggleStagePermission(stage.id, perm.id!)}
                                              />
                                              <span className="text-sm leading-tight">{perm.name}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
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
