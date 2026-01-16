import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { X, Building2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OrgManagementList } from '../../components/admin/OrgManagementList';
import { CreateOrgForm } from '../../components/admin/CreateOrgForm';
import { Message, OrgRow } from '../../components/admin/types';
import { UserManagementList } from '../../components/admin/UserManagementList';
import { MemberTable } from '../../components/settings/MemberTable';
import { Member } from '../../components/settings/types';
import { useAdminOrgs } from '../../hooks/queries/useAdmin';
import { useQueryClient } from '@tanstack/react-query';

export const SuperAdminPage = () => {
    const [activeTab, setActiveTab] = useState<'orgs' | 'users'>('orgs');

    const [orgName, setOrgName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<Message>(null);

    const queryClient = useQueryClient();
    const { data: orgs = [], isLoading: orgsLoading, error: orgsError } = useAdminOrgs();
    const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<Record<string, string>>({});
    const [ownerChange, setOwnerChange] = useState<Record<string, string>>({});
    const [memberInvite, setMemberInvite] = useState<Record<string, { email: string; role: 'admin' | 'member' }>>({});
    const [orgActionMsg, setOrgActionMsg] = useState<string | null>(null);

    const [managingMembersOrg, setManagingMembersOrg] = useState<OrgRow | null>(null);
    const [currentOrgMembers, setCurrentOrgMembers] = useState<Member[]>([]);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

    useEffect(() => {
        if (orgsError) setOrgActionMsg(orgsError.message);
        if (orgs.length) {
            const renameSeed: Record<string, string> = {};
            const ownerSeed: Record<string, string> = {};
            orgs.forEach((o) => {
                renameSeed[o.id] = o.name;
                ownerSeed[o.id] = '';
            });
            setRenaming(renameSeed);
            setOwnerChange(ownerSeed);
        }
    }, [orgsError, orgs]);

    const loadOrgMembers = async (orgId: string) => {
        const { data, error } = await supabase
            .from('organization_members')
            .select('id, role, user_id, profiles:profiles!organization_members_user_id_fkey(email, full_name)')
            .eq('org_id', orgId);

        if (!error && data) {
            const normalized = data.map((m) => ({
                ...m,
                profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
            }));
            setCurrentOrgMembers(normalized as Member[]);
        }
    };

    const handleOpenMemberManager = async (org: OrgRow) => {
        setManagingMembersOrg(org);
        await loadOrgMembers(org.id);
    };

    const handleRemoveMember = async (member: Member) => {
        if (!managingMembersOrg) return;
        setRemovingMemberId(member.id);
        try {
            await supabase.from('organization_members').delete().eq('id', member.id);
            await loadOrgMembers(managingMembersOrg.id);
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
        } catch (error) {
            console.error(error);
        } finally {
            setRemovingMemberId(null);
        }
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', ownerEmail.trim().toLowerCase())
                .limit(1);

            if (profileError) throw profileError;
            if (!profiles || profiles.length === 0) {
                throw new Error('User not found. Please ask them to sign up first.');
            }
            const ownerId = profiles[0].id;

            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({ name: orgName, owner_id: ownerId })
                .select()
                .single();

            if (orgError) throw orgError;

            await supabase.from('organization_members').insert({
                org_id: org.id,
                user_id: ownerId,
                role: 'admin',
            });

            setMessage({ type: 'success', text: `Organization "${orgName}" created.` });
            setOrgName('');
            setOwnerEmail('');
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRename = async (orgId: string) => {
        const nextName = (renaming[orgId] || '').trim();
        if (!nextName) return;
        try {
            await supabase.from('organizations').update({ name: nextName }).eq('id', orgId);
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
        } catch (err: any) {
            setOrgActionMsg(err.message);
        }
    };

    const handleChangeOwner = async (orgId: string) => {
        const email = (ownerChange[orgId] || '').trim().toLowerCase();
        if (!email) return;
        try {
            const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).limit(1).single();
            if (!profiles) throw new Error('User not found');

            await supabase.from('organizations').update({ owner_id: profiles.id }).eq('id', orgId);

            const { data: member } = await supabase
                .from('organization_members')
                .select('id')
                .eq('org_id', orgId)
                .eq('user_id', profiles.id)
                .single();

            if (!member) {
                await supabase.from('organization_members').insert({ org_id: orgId, user_id: profiles.id, role: 'admin' });
            } else {
                await supabase.from('organization_members').update({ role: 'admin' }).eq('id', member.id);
            }
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
        } catch (err: any) {
            setOrgActionMsg(err.message);
        }
    };

    const handleInviteMember = async (orgId: string) => {
        const payload = memberInvite[orgId];
        if (!payload?.email) return;
        try {
            const { data: profile } = await supabase.from('profiles').select('id').eq('email', payload.email).single();
            if (!profile) throw new Error('User not found');
            await supabase.from('organization_members').insert({ org_id: orgId, user_id: profile.id, role: payload.role });
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
        } catch (err: any) {
            setOrgActionMsg(err.message);
        }
    };

    const handleDeleteOrg = async (orgId: string) => {
        setDeletingOrgId(orgId);
        try {
            await supabase.from('organizations').delete().eq('id', orgId);
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
        } catch (err: any) {
            setOrgActionMsg(err.message);
        } finally {
            setDeletingOrgId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Super Admin Dashboard</h1>

            <div className="border-b border-slate-200 mb-8">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('orgs')}
                        className={clsx(
                            'pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                            activeTab === 'orgs'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        )}
                    >
                        <Building2 className="w-4 h-4" />
                        Organizations
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={clsx(
                            'pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors',
                            activeTab === 'users'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        )}
                    >
                        <Users className="w-4 h-4" />
                        All Users
                    </button>
                </nav>
            </div>

            {activeTab === 'orgs' ? (
                <>
                    <div className="max-w-2xl mb-10">
                        <CreateOrgForm
                            orgName={orgName}
                            ownerEmail={ownerEmail}
                            loading={loading}
                            message={message}
                            onOrgNameChange={setOrgName}
                            onOwnerEmailChange={setOwnerEmail}
                            onSubmit={handleCreateOrg}
                        />
                    </div>

                    <OrgManagementList
                        orgs={orgs}
                        orgsLoading={orgsLoading}
                        orgActionMsg={orgActionMsg}
                        renaming={renaming}
                        ownerChange={ownerChange}
                        memberInvite={memberInvite}
                        deletingOrgId={deletingOrgId}
                        onRenameChange={(id, value) => setRenaming((prev) => ({ ...prev, [id]: value }))}
                        onRenameSave={handleRename}
                        onOwnerChange={(id, value) => setOwnerChange((prev) => ({ ...prev, [id]: value }))}
                        onOwnerSave={handleChangeOwner}
                        onMemberInviteChange={(id, value) => setMemberInvite((prev) => ({ ...prev, [id]: value }))}
                        onInviteMember={handleInviteMember}
                        onDeleteOrg={handleDeleteOrg}
                        onManageMembers={handleOpenMemberManager}
                    />
                </>
            ) : (
                <UserManagementList />
            )}

            {managingMembersOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                Managing Members: {managingMembersOrg.name}
                            </h3>
                            <button onClick={() => setManagingMembersOrg(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <MemberTable
                                members={currentOrgMembers}
                                organization={{ id: managingMembersOrg.id, name: managingMembersOrg.name, owner_id: '', created_at: '' }}
                                canManage
                                removingId={removingMemberId}
                                onRemove={handleRemoveMember}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};