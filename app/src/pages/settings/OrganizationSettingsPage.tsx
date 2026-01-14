import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Mail, Shield, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Organization = {
    id: string;
    name: string;
    owner_id: string;
    created_at: string | null;
};

type Member = {
    id: string;
    user_id: string;
    role: 'admin' | 'member';
    profiles?: {
        email: string | null;
        full_name: string | null;
    } | null;
};

export const OrganizationSettingsPage = () => {
    const { user } = useAuth();

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [membershipRole, setMembershipRole] = useState<'owner' | 'admin' | 'member' | null>(null);
    const [members, setMembers] = useState<Member[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [orgNameInput, setOrgNameInput] = useState('');
    const [savingOrg, setSavingOrg] = useState(false);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const [removingId, setRemovingId] = useState<string | null>(null);

    const [creatingOrgName, setCreatingOrgName] = useState('');
    const [creatingOrg, setCreatingOrg] = useState(false);

    const canManage = membershipRole === 'owner' || membershipRole === 'admin';

    const loadMembers = useCallback(async (orgId: string) => {
        const { data, error: membersError } = await supabase
            .from('organization_members')
            .select('id, role, user_id, profiles:profiles!organization_members_user_id_fkey(email, full_name)')
            .eq('org_id', orgId);

        if (membersError) throw membersError;
        const normalized = (data || []).map((m) => ({
            ...m,
            profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
        }));
        setMembers(normalized as Member[]);
    }, []);

    const loadOrganization = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const { data: memberships, error: membershipsError } = await supabase
                .from('organization_members')
                .select('org_id, role')
                .eq('user_id', user.id);

            if (membershipsError) throw membershipsError;

            const orgIds = (memberships || []).map((m) => m.org_id).filter(Boolean);
            const filters = [`owner_id.eq.${user.id}`];
            if (orgIds.length) {
                filters.push(`id.in.(${orgIds.join(',')})`);
            }

            const { data: orgs, error: orgError } = await supabase
                .from('organizations')
                .select('id, name, created_at, owner_id')
                .or(filters.join(','))
                .order('created_at', { ascending: true });

            if (orgError) throw orgError;

            const primary = orgs?.[0] || null;
            setOrganization(primary);

            if (primary) {
                setOrgNameInput(primary.name);
                const memberRole = (memberships || []).find((m) => m.org_id === primary.id)?.role;
                const derivedRole: 'owner' | 'admin' | 'member' | null =
                    memberRole === 'admin' || memberRole === 'member'
                        ? memberRole
                        : primary.owner_id === user.id
                            ? 'owner'
                            : null;
                setMembershipRole(derivedRole);
                await loadMembers(primary.id);
            } else {
                setMembers([]);
                setMembershipRole(null);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load organization');
            setOrganization(null);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, [user, loadMembers]);

    useEffect(() => {
        loadOrganization();
    }, [loadOrganization]);

    const handleUpdateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;
        const nextName = orgNameInput.trim();
        if (!nextName) {
            setError('Organization name cannot be empty');
            return;
        }

        setSavingOrg(true);
        setError(null);
        try {
            const { error: updateError } = await supabase
                .from('organizations')
                .update({ name: nextName })
                .eq('id', organization.id);

            if (updateError) throw updateError;
            setOrganization((prev) => prev ? { ...prev, name: nextName } : prev);
            setEditing(false);
        } catch (err: any) {
            setError(err.message || 'Failed to update organization');
        } finally {
            setSavingOrg(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        const email = inviteEmail.trim().toLowerCase();
        if (!email) {
            setInviteError('Email is required');
            return;
        }

        setInviting(true);
        setInviteError(null);

        try {
            const { data: profileRows, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('email', email)
                .limit(1);

            if (profileError) throw profileError;
            const profile = profileRows?.[0];

            if (!profile) {
                throw new Error('No user found with that email. Ask them to sign up first.');
            }

            const alreadyMember = members.some((m) => m.user_id === profile.id);
            if (alreadyMember) {
                throw new Error('User is already a member of this organization.');
            }

            const { error: insertError } = await supabase
                .from('organization_members')
                .insert({
                    org_id: organization.id,
                    user_id: profile.id,
                    role: inviteRole,
                });

            if (insertError) throw insertError;

            setInviteEmail('');
            setInviteRole('member');
            await loadMembers(organization.id);
        } catch (err: any) {
            setInviteError(err.message || 'Failed to invite member');
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (member: Member) => {
        if (!organization) return;
        if (member.user_id === organization.owner_id) return;

        setRemovingId(member.id);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('organization_members')
                .delete()
                .eq('id', member.id);

            if (deleteError) throw deleteError;
            await loadMembers(organization.id);
        } catch (err: any) {
            setError(err.message || 'Failed to remove member');
        } finally {
            setRemovingId(null);
        }
    };

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const name = creatingOrgName.trim();
        if (!name) {
            setError('Organization name is required');
            return;
        }

        setCreatingOrg(true);
        setError(null);
        try {
            const { data: orgRow, error: createError } = await supabase
                .from('organizations')
                .insert({ name, owner_id: user.id })
                .select('id, name, owner_id, created_at')
                .single();

            if (createError) throw createError;

            await supabase.from('organization_members').insert({
                org_id: orgRow.id,
                user_id: user.id,
                role: 'admin',
            });

            setOrganization(orgRow);
            setOrgNameInput(orgRow.name);
            setMembershipRole('owner');
            setCreatingOrgName('');
            await loadMembers(orgRow.id);
        } catch (err: any) {
            setError(err.message || 'Failed to create organization');
        } finally {
            setCreatingOrg(false);
            setLoading(false);
        }
    };

    const initialLetter = useMemo(() => {
        if (organization?.name) return organization.name.charAt(0).toUpperCase();
        return 'W';
    }, [organization?.name]);

    if (loading) {
        return (
            <div className="p-8 max-w-5xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading organization...
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="p-8 max-w-3xl mx-auto space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                        {error}
                    </div>
                )}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">Create your organization</h1>
                    <p className="text-sm text-slate-500 mb-4">
                        You do not belong to an organization yet. Create one to start inviting teammates and sharing workflows.
                    </p>
                    <form className="space-y-4" onSubmit={handleCreateOrganization}>
                        <div>
                            <label htmlFor="org-name" className="block text-sm font-medium text-slate-700">Organization name</label>
                            <input
                                id="org-name"
                                value={creatingOrgName}
                                onChange={(e) => setCreatingOrgName(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Acme Data Team"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creatingOrg}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-60"
                        >
                            {creatingOrg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Create organization
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Org Header */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                            {initialLetter}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{organization.name}</h1>
                            <p className="text-slate-500 text-sm">Created {organization.created_at ? new Date(organization.created_at).toLocaleDateString() : 'recently'} • {members.length} members</p>
                            {membershipRole && (
                                <p className="text-xs text-slate-500 mt-1">You are an {membershipRole === 'owner' ? 'owner' : membershipRole}</p>
                            )}
                        </div>
                    </div>

                    {canManage && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
                        >
                            Edit Details
                        </button>
                    )}
                </div>

                {editing && (
                    <form className="mt-4 flex flex-col gap-3" onSubmit={handleUpdateOrg}>
                        <div>
                            <label htmlFor="org-edit-name" className="block text-sm font-medium text-slate-700">Organization name</label>
                            <input
                                id="org-edit-name"
                                value={orgNameInput}
                                onChange={(e) => setOrgNameInput(e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={savingOrg}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-60"
                            >
                                {savingOrg ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save changes
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="text-sm text-slate-600 hover:text-slate-800 px-3 py-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Invite Form */}
            {canManage && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Invite a member</h2>
                            <p className="text-sm text-slate-500">Add teammates by email. Users must already have an account.</p>
                        </div>
                    </div>
                    {inviteError && (
                        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                            {inviteError}
                        </div>
                    )}
                    <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleInvite}>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700" htmlFor="invite-email">Email address</label>
                            <div className="mt-1 relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    id="invite-email"
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="teammate@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700" htmlFor="invite-role">Role</label>
                            <select
                                id="invite-role"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="md:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={inviting}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-60"
                            >
                                {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                Send invite
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Members Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
                        <p className="text-sm text-slate-500">Manage who has access to your organization's workflows.</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Member</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-6 text-center text-slate-500 text-sm">No members yet.</td>
                                </tr>
                            ) : members.map((member) => {
                                const displayName = member.profiles?.full_name || member.profiles?.email || 'Unknown user';
                                const email = member.profiles?.email || 'Unknown email';
                                const roleLabel = member.user_id === organization.owner_id ? 'owner' : member.role;
                                const statusLabel = 'Active';

                                return (
                                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm mr-3">
                                                    {displayName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{displayName}</div>
                                                    <div className="text-sm text-slate-500">{email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-slate-700 capitalize">
                                                <Shield className="w-4 h-4 mr-1.5 text-slate-400" />
                                                {roleLabel}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {canManage && member.user_id !== organization.owner_id ? (
                                                <button
                                                    onClick={() => handleRemoveMember(member)}
                                                    disabled={removingId === member.id}
                                                    className="inline-flex items-center text-slate-400 hover:text-red-600 disabled:opacity-50"
                                                >
                                                    {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    <span className="sr-only">Remove member</span>
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
