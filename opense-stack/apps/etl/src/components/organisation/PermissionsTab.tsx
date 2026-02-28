import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Textarea, StackLayout } from '@repo/ui';
import { Plus, Shield, Trash2, Save } from 'lucide-react';
import { createOrgRole, deleteOrgRole, updateOrgRole } from '../../api/permissions';
import { useAppPermissions, useOrgRoles } from '../../hooks/queries/usePermissions';
import { OrgSimple } from '../../types/organisation';

type OutletContextType = {
  currentOrg: OrgSimple | null;
  userRole: string | null;
};

export const PermissionsTab = () => {
  const { currentOrg, userRole } = useOutletContext<OutletContextType>();
  const queryClient = useQueryClient();
  const canManageRoles = userRole === 'owner' || userRole === 'admin';

  const { data: appPermissions = [], isLoading: permissionsLoading } = useAppPermissions();
  const { data: orgRoles = [], isLoading: rolesLoading } = useOrgRoles(currentOrg?.id);
  
  const [activeRoleId, setActiveRoleId] = useState<string | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first role if none selected
  useEffect(() => {
    if (!activeRoleId && orgRoles.length > 0) {
      handleSelectRole(orgRoles[0]);
    }
  }, [orgRoles, activeRoleId]);

  const handleSelectRole = (role: any) => {
    setActiveRoleId(role.id);
    setName(role.name);
    setDescription(role.description ?? '');
    setSelectedPermissions(role.permissionCodes);
    setError(null);
  };

  const handleStartCreate = () => {
    setActiveRoleId('new');
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setError(null);
  };

  const handleTogglePermission = (permissionCode: string, checked: boolean) => {
    setSelectedPermissions((current) => {
      if (checked) {
        return Array.from(new Set([...current, permissionCode]));
      }
      return current.filter((code) => code !== permissionCode);
    });
  };

  const refreshRoles = async () => {
    await queryClient.invalidateQueries({ queryKey: ['orgRoles', currentOrg?.id] });
    await queryClient.invalidateQueries({ queryKey: ['memberRoleAssignments', currentOrg?.id] });
  };

  const handleSaveRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentOrg) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Role name is required.');
      return;
    }

    if (selectedPermissions.length === 0) {
      setError('Select at least one permission.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (activeRoleId === 'new') {
        const roleId = await createOrgRole(currentOrg.id, {
          name: trimmedName,
          description,
          permissionCodes: selectedPermissions,
        });
        setActiveRoleId(roleId);
      } else if (activeRoleId) {
        await updateOrgRole(activeRoleId, {
          name: trimmedName,
          description,
          permissionCodes: selectedPermissions,
        });
      }

      await refreshRoles();
      // Keep it selected, wait for refresh to finish, don't reset form unless it was new? Actually, leaving it selected is fine.
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!activeRoleId || activeRoleId === 'new') return;
    if (!window.confirm('Delete this role? Members assigned to it will lose the custom role assignment.')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await deleteOrgRole(activeRoleId);
      await refreshRoles();

      setActiveRoleId(null);
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete role.');
    } finally {
      setSaving(false);
    }
  };

  if (!currentOrg) return null;

  const isEditing = activeRoleId && activeRoleId !== 'new';
  const isCreating = activeRoleId === 'new';

  return (
    <StackLayout variant="grid">
      {/* LEFT SIDE: Roles List */}
      <Card padding="md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Organisation Roles</CardTitle>
            <CardDescription>Manage roles and their permissions.</CardDescription>
          </div>
          {canManageRoles && (
            <Button size="icon" variant="outline" onClick={handleStartCreate} disabled={saving} title="Create New Role">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">Loading roles...</div>
          ) : orgRoles.length === 0 && !isCreating ? (
            <div className="text-center p-8 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              No roles found.
            </div>
          ) : (
            <div className="space-y-2">
              {orgRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                    activeRoleId === role.id
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${activeRoleId === role.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{role.name}</p>
                      <p className="text-xs text-slate-500">{role.permissionCodes.length} permissions</p>
                    </div>
                  </div>
                </button>
              ))}

              {isCreating && (
                <div className="w-full flex items-center gap-3 p-3 rounded-lg border text-left border-blue-500 bg-blue-50 ring-1 ring-blue-500">
                  <div className="p-2 rounded-md bg-blue-100 text-blue-700">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 line-clamp-1">{name || 'New Role'}</p>
                    <p className="text-xs text-slate-500">Draft</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RIGHT SIDE: Edit/Create Form */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>{isCreating ? 'Create New Role' : isEditing ? 'Edit Role' : 'Role Details'}</CardTitle>
          <CardDescription>
            {isCreating ? 'Define a new set of permissions.' : isEditing ? 'Update the permissions for this role.' : 'Select a role to view details.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeRoleId ? (
            <div className="flex h-full items-center justify-center p-12 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed">
              Select a role from the list or create a new one.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSaveRole}>
              {!canManageRoles && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  You are viewing this role in read-only mode. Only owners and admins can edit roles.
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <span className="font-medium flex-1">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="role-name" className="text-sm font-medium text-slate-700">Role Name</label>
                  <Input
                    id="role-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Content Editor"
                    disabled={!canManageRoles || saving}
                    className="max-w-md"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="role-desc" className="text-sm font-medium text-slate-700">Description</label>
                  <Textarea
                    id="role-desc"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Briefly describe what this role allows..."
                    disabled={!canManageRoles || saving}
                    className="max-w-md min-h-[80px]"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-slate-900">Permissions</label>
                  <span className="text-xs text-slate-500">
                    {selectedPermissions.length} selected
                  </span>
                </div>

                {permissionsLoading ? (
                  <div className="p-8 text-center text-sm text-slate-500">Loading available permissions...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {appPermissions.map((permission) => (
                      <div 
                        key={permission.code} 
                        className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selectedPermissions.includes(permission.code) 
                            ? 'border-blue-200 bg-blue-50/50' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          <Checkbox
                            id={`perm-${permission.code}`}
                            checked={selectedPermissions.includes(permission.code)}
                            onChange={(event) => handleTogglePermission(permission.code, event.target.checked)}
                            disabled={!canManageRoles || saving}
                          />
                        </div>
                        <label 
                          htmlFor={`perm-${permission.code}`} 
                          className="flex-1 cursor-pointer select-none space-y-1"
                        >
                          <p className="text-sm font-medium text-slate-900">{permission.code}</p>
                          {permission.description && (
                            <p className="text-xs text-slate-500 leading-snug">{permission.description}</p>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canManageRoles && (
                <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-6">
                  {isEditing ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleDeleteRole} 
                      disabled={saving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Role
                    </Button>
                  ) : (
                    <div /> /* spacer */
                  )}
                  
                  <div className="flex gap-3">
                    {isCreating && (
                      <Button type="button" variant="outline" onClick={() => {
                        setActiveRoleId(orgRoles.length > 0 ? orgRoles[0].id : null);
                        if (orgRoles.length > 0) handleSelectRole(orgRoles[0]);
                      }} disabled={saving}>
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={saving || !name.trim() || selectedPermissions.length === 0}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : isCreating ? 'Create Role' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </StackLayout>
  );
};
