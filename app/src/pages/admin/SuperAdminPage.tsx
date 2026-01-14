import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

type OrgRow = {
    id: string;
    name: string;
    created_at: string | null;
    owner?: { email: string | null; full_name: string | null } | null;
    member_count?: number | null;
};

export const SuperAdminPage = () => {
    const [orgName, setOrgName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    const orgsEmpty = useMemo(() => (orgs || []).length === 0, [orgs]);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Super Admin Dashboard</h1>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-slate-900 mb-4">Onboard New Client</h2>

                {message && (
                    <div
                        className={`mb-4 p-4 rounded-md flex items-center gap-2 text-sm ${
                            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                    >
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleCreateOrg} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Organization Name</label>
                        <input
                            type="text"
                            required
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g. Acme Corp"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Owner Email</label>
                        <input
                            type="email"
                            required
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="client@example.com"
                        />
                        <p className="mt-1 text-xs text-slate-500">The user must have already signed up to the platform.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create & Assign Organization'}
                    </button>
                </form>
            </div>

            <div className="mt-10 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-medium text-slate-900">Manage Organizations</h2>
                        <p className="text-sm text-slate-500">Rename, change owner, add members, or delete.</p>
                    </div>
                    {orgsLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                </div>

                {orgActionMsg && (
                    <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">{orgActionMsg}</div>
                )}

                {orgsEmpty ? (
                    <div className="text-sm text-slate-500">No organizations yet.</div>
                ) : (
                    <div className="space-y-6">
                        {orgs.map((org) => (
                            <div key={org.id} className="border border-slate-200 rounded-md p-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">{org.name}</div>
                                        <div className="text-xs text-slate-500">ID: {org.id}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Owner: {org.owner?.email || 'Unknown'} · Members: {org.member_count ?? '—'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDeleteOrg(org.id)}
                                            disabled={deletingOrgId === org.id}
                                            className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
                                        >
                                            {deletingOrgId === org.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            <span className="ml-1">Delete</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700">Rename</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={renaming[org.id] || ''}
                                                onChange={(e) => setRenaming((prev) => ({ ...prev, [org.id]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                            />
                                            <button
                                                onClick={() => handleRename(org.id)}
                                                className="px-3 py-2 bg-slate-800 text-white text-sm rounded-md"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700">Change Owner (email)</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={ownerChange[org.id] || ''}
                                                onChange={(e) => setOwnerChange((prev) => ({ ...prev, [org.id]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                                placeholder="owner@example.com"
                                            />
                                            <button
                                                onClick={() => handleChangeOwner(org.id)}
                                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md"
                                            >
                                                Update
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-700">Add Member</label>
                                        <div className="flex gap-2">
                                            <input
                                                value={memberInvite[org.id]?.email || ''}
                                                onChange={(e) => setMemberInvite((prev) => ({
                                                    ...prev,
                                                    [org.id]: { email: e.target.value, role: prev[org.id]?.role || 'member' },
                                                }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                                placeholder="user@example.com"
                                            />
                                            <select
                                                value={memberInvite[org.id]?.role || 'member'}
                                                onChange={(e) => setMemberInvite((prev) => ({
                                                    ...prev,
                                                    [org.id]: { email: prev[org.id]?.email || '', role: e.target.value as 'admin' | 'member' },
                                                }))}
                                                className="px-2 py-2 border border-slate-300 rounded-md text-sm"
                                            >
                                                <option value="member">Member</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button
                                                onClick={() => handleInviteMember(org.id)}
                                                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
