import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { OrgManagementList } from '../../components/admin/OrgManagementList';
import { CreateOrgForm } from '../../components/admin/CreateOrgForm';
import { Message, OrgRow } from '../../components/admin/types';

export const SuperAdminPage = () => {
    const [orgName, setOrgName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<Message>(null);

    const [orgs, setOrgs] = useState<OrgRow[]>([]);
    const [orgsLoading, setOrgsLoading] = useState(false);
    const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<Record<string, string>>({});
    const [ownerChange, setOwnerChange] = useState<Record<string, string>>({});
    const [memberInvite, setMemberInvite] = useState<Record<string, { email: string; role: 'admin' | 'member' }>>({});
    const [orgActionMsg, setOrgActionMsg] = useState<string | null>(null);

    const loadOrgs = async () => {
        setOrgsLoading(true);
        setOrgActionMsg(null);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id, name, created_at, owner:profiles!organizations_owner_id_fkey(email, full_name), organization_members(count)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped: OrgRow[] = (data || []).map((o) => ({
                id: o.id,
                name: o.name,
                created_at: o.created_at,
                owner: Array.isArray(o.owner) ? o.owner[0] ?? null : o.owner ?? null,
                member_count: Array.isArray(o.organization_members) && o.organization_members[0]?.count != null
                    ? o.organization_members[0].count
                    : null,
            }));
            setOrgs(mapped);
            const renameSeed: Record<string, string> = {};
            const ownerSeed: Record<string, string> = {};
            mapped.forEach((o) => {
                renameSeed[o.id] = o.name;
                ownerSeed[o.id] = '';
            });
            setRenaming(renameSeed);
            setOwnerChange(ownerSeed);
        } catch (err: any) {
            setOrgActionMsg(err.message || 'Failed to load organizations');
        } finally {
            setOrgsLoading(false);
        }
    };

    useEffect(() => {
        loadOrgs();
    }, []);

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
                .insert({
                    name: orgName,
                    owner_id: ownerId,
                })
                .select()
                .single();

            if (orgError) throw orgError;

            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    org_id: org.id,
                    user_id: ownerId,
                    role: 'admin',
                });

            if (memberError) throw memberError;

            setMessage({ type: 'success', text: `Organization "${orgName}" created and assigned to ${ownerEmail}.` });
            setOrgName('');
            setOwnerEmail('');
            await loadOrgs();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRename = async (orgId: string) => {
        const nextName = (renaming[orgId] || '').trim();
        if (!nextName) return;
        setOrgActionMsg(null);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ name: nextName })
                .eq('id', orgId);
            if (error) throw error;
            await loadOrgs();
        } catch (err: any) {
            setOrgActionMsg(err.message || 'Failed to rename organization');
        }
    };

    const handleChangeOwner = async (orgId: string) => {
        const email = (ownerChange[orgId] || '').trim().toLowerCase();
        if (!email) return;
        setOrgActionMsg(null);
        try {
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .limit(1);
            if (profileError) throw profileError;
            if (!profiles || profiles.length === 0) throw new Error('User not found. Ask them to sign up first.');
            const newOwnerId = profiles[0].id;

            const { error: updateError } = await supabase
                .from('organizations')
                .update({ owner_id: newOwnerId })
                .eq('id', orgId);
            if (updateError) throw updateError;

            // ensure owner is at least a member admin
            const { data: existingMember } = await supabase
                .from('organization_members')
                .select('id, role')
                .eq('org_id', orgId)
                .eq('user_id', newOwnerId)
                .limit(1);

            if (!existingMember || existingMember.length === 0) {
                await supabase.from('organization_members').insert({ org_id: orgId, user_id: newOwnerId, role: 'admin' });
            } else if (existingMember[0].role !== 'admin') {
                await supabase.from('organization_members').update({ role: 'admin' }).eq('id', existingMember[0].id);
            }

            await loadOrgs();
        } catch (err: any) {
            setOrgActionMsg(err.message || 'Failed to change owner');
        }
    };

    const handleInviteMember = async (orgId: string) => {
        const payload = memberInvite[orgId];
        if (!payload || !payload.email) return;
        const email = payload.email.trim().toLowerCase();
        const role = payload.role;
        setOrgActionMsg(null);
        try {
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .limit(1);
            if (profileError) throw profileError;
            if (!profiles || profiles.length === 0) throw new Error('User not found. Ask them to sign up first.');
            const userId = profiles[0].id;

            const { error: insertError } = await supabase
                .from('organization_members')
                .insert({ org_id: orgId, user_id: userId, role });
            if (insertError) throw insertError;
            await loadOrgs();
        } catch (err: any) {
            setOrgActionMsg(err.message || 'Failed to add member');
        }
    };

    const handleDeleteOrg = async (orgId: string) => {
        setDeletingOrgId(orgId);
        setOrgActionMsg(null);
        try {
            const { error } = await supabase.from('organizations').delete().eq('id', orgId);
            if (error) throw error;
            await loadOrgs();
        } catch (err: any) {
            setOrgActionMsg(err.message || 'Failed to delete organization');
        } finally {
            setDeletingOrgId(null);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Super Admin Dashboard</h1>

            <CreateOrgForm
                orgName={orgName}
                ownerEmail={ownerEmail}
                loading={loading}
                message={message}
                onOrgNameChange={setOrgName}
                onOwnerEmailChange={setOwnerEmail}
                onSubmit={handleCreateOrg}
            />

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
            />
        </div>
    );
};
