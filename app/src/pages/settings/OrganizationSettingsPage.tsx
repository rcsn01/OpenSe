import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Organization, Member } from '../../components/settings/types';
import { OrgHeader } from '../../components/settings/OrgHeader';
import { InviteMemberForm } from '../../components/settings/InviteMemberForm';
import { MemberTable } from '../../components/settings/MemberTable';

export const OrganizationSettingsPage = () => {
    const { user, isSuperAdmin } = useAuth();

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
        if (!user) {
            setLoading(false);
            return;
        }
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
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 text-center">
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">No Organization Found</h1>
                    <p className="text-sm text-slate-500 mb-4">
                        You are not a member of any organization yet.
                    </p>
                    <div className="bg-blue-50 text-blue-700 p-4 rounded-md text-sm">
                        To set up a new organization, please contact support to arrange terms and payment.
                    </div>

                    {isSuperAdmin && (
                        <div className="mt-8 border-t pt-6 text-left">
                            <h2 className="text-sm font-bold text-slate-900 mb-2">Super Admin Controls</h2>
                            <p className="text-xs text-slate-500 mb-4">Use the Super Admin Dashboard to onboard new clients.</p>
                            <Link
                                to="/admin"
                                className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 text-sm"
                            >
                                Go to Super Admin Dashboard
                            </Link>
                        </div>
                    )}
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

            <OrgHeader
                organization={organization}
                membershipRole={membershipRole}
                membersCount={members.length}
                initialLetter={initialLetter}
                canManage={canManage}
                editing={editing}
                orgNameInput={orgNameInput}
                savingOrg={savingOrg}
                onEditToggle={setEditing}
                onOrgNameChange={setOrgNameInput}
                onSubmit={handleUpdateOrg}
            />

            {canManage && (
                <InviteMemberForm
                    inviteEmail={inviteEmail}
                    inviteRole={inviteRole}
                    inviting={inviting}
                    inviteError={inviteError}
                    onInviteEmailChange={setInviteEmail}
                    onInviteRoleChange={setInviteRole}
                    onSubmit={handleInvite}
                />
            )}

            {/* Members Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
                        <p className="text-sm text-slate-500">Manage who has access to your organization's workflows.</p>
                    </div>
                </div>

                <MemberTable
                    members={members}
                    organization={organization}
                    canManage={canManage}
                    removingId={removingId}
                    onRemove={handleRemoveMember}
                />
            </div>
        </div>
    );
};
