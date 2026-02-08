import { useState } from 'react';
import { 
    Building2, 
    Users, 
    Plus, 
    ShieldCheck, 
    X 
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminOrgs, useAdminUsers } from '../hooks/queries/useAdmin';
import { 
    createOrganisationWithOwner, 
    renameOrganisation, 
    changeOrganisationOwner, 
    inviteMemberToOrganisation, 
    deleteOrganisation,
    deleteOrganisationMember, 
    loadOrganisationMembers
} from '../api/admin';

// Components
import { OrgManagementList } from '../components/admin/OrgManagementList';
import { UserManagementList } from '../components/admin/UserManagementList';
import { CreateOrgForm } from '../components/admin/CreateOrgForm';
import { MemberTable } from '../components/settings/MemberTable';
import { Member } from '../components/settings/types';
import { OrgRow, Message } from '../components/admin/types';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';

// Internal Modal for specific page actions
const PageModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: React.ReactNode; 
  children: React.ReactNode 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SuperAdminPage = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'orgs' | 'users'>('orgs');
    
    // Data Fetching
    const { data: orgs = [], isLoading: orgsLoading, error: orgsError } = useAdminOrgs();
    const { data: users = [], isLoading: usersLoading } = useAdminUsers();

    // Create Org State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgOwner, setNewOrgOwner] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState<Message>(null);

    // Member Management State
    const [managingMembersOrg, setManagingMembersOrg] = useState<OrgRow | null>(null);
    const [currentOrgMembers, setCurrentOrgMembers] = useState<Member[]>([]);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

    // --- Stats Calculation ---
    const totalOrgs = orgs.length;
    const totalUsers = users.length;
    // Simple heuristic for "active": has signed in (but we don't strictly track 'last_sign_in' in public profile yet, so we use total)
    const adminCount = users.filter(u => u.super_admin_members && u.super_admin_members.length > 0).length;

    // --- Handlers ---

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateMessage(null);
        try {
            await createOrganisationWithOwner(newOrgName, newOrgOwner);
            setCreateMessage({ type: 'success', text: `Organisation "${newOrgName}" created successfully.` });
            setNewOrgName('');
            setNewOrgOwner('');
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
            setTimeout(() => {
                setIsCreateModalOpen(false);
                setCreateMessage(null);
            }, 1500);
        } catch (err: any) {
            setCreateMessage({ type: 'error', text: err.message });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleRenameOrg = async (id: string, newName: string) => {
        await renameOrganisation(id, newName);
        queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
    };

    const handleTransferOrg = async (id: string, newOwnerEmail: string) => {
        await changeOrganisationOwner(id, newOwnerEmail);
        queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
    };

    const handleInviteToOrg = async (id: string, email: string, role: 'admin' | 'editor' | 'member') => {
        await inviteMemberToOrganisation(id, email, role);
        queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
    };

    const handleDeleteOrg = async (id: string) => {
        await deleteOrganisation(id);
        queryClient.invalidateQueries({ queryKey: ['adminOrgs'] });
    };

    const openMemberManager = async (org: OrgRow) => {
        setManagingMembersOrg(org);
        const members = await loadOrganisationMembers(org.id);
        setCurrentOrgMembers(members as Member[]);
    };

    const handleRemoveMember = async (member: Member) => {
        if (!managingMembersOrg) return;
        setRemovingMemberId(member.id);
        try {
            await deleteOrganisationMember(member.id);
            const updated = await loadOrganisationMembers(managingMembersOrg.id);
            setCurrentOrgMembers(updated as Member[]);
            queryClient.invalidateQueries({ queryKey: ['adminOrgs'] }); // Update counts
        } catch (error) {
            console.error(error);
        } finally {
            setRemovingMemberId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Administration</h1>
                    <p className="text-slate-500 mt-1">Manage platform resources, organisations, and user access.</p>
                </div>
                <div>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-lg shadow-blue-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        New Organisation
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Organisations</p>
                        <p className="text-2xl font-bold text-slate-900">{orgsLoading ? '...' : totalOrgs}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Users</p>
                        <p className="text-2xl font-bold text-slate-900">{usersLoading ? '...' : totalUsers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Super Admins</p>
                        <p className="text-2xl font-bold text-slate-900">{usersLoading ? '...' : adminCount}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="px-6 pt-4">
                    <Tabs
                        tabs={[
                            { id: 'orgs', label: 'Organisations', icon: <Building2 className="w-4 h-4" /> },
                            { id: 'users', label: 'User Directory', icon: <Users className="w-4 h-4" /> },
                        ]}
                        activeTab={activeTab}
                        onTabChange={(id) => setActiveTab(id as 'orgs' | 'users')}
                    />
                </div>

                <div className="p-6">
                    {activeTab === 'orgs' ? (
                        <>
                            {orgsError && (
                                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                                    Error loading organisations: {orgsError.message}
                                </div>
                            )}
                            <OrgManagementList
                                orgs={orgs}
                                orgsLoading={orgsLoading}
                                onRename={handleRenameOrg}
                                onTransfer={handleTransferOrg}
                                onInvite={handleInviteToOrg}
                                onDelete={handleDeleteOrg}
                                onManageMembers={openMemberManager}
                            />
                        </>
                    ) : (
                        <UserManagementList />
                    )}
                </div>
            </div>

            {/* --- Modals --- */}

            {/* Create Org Modal */}
            <PageModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 rounded-md text-blue-700">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <span>Onboard New Organisation</span>
                    </div>
                }
            >
                <CreateOrgForm
                    orgName={newOrgName}
                    ownerEmail={newOrgOwner}
                    loading={createLoading}
                    message={createMessage}
                    onOrgNameChange={setNewOrgName}
                    onOwnerEmailChange={setNewOrgOwner}
                    onSubmit={handleCreateOrg}
                />
            </PageModal>

            {/* Manage Members Modal */}
            {managingMembersOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Manage Members
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Organisation: {managingMembersOrg.name}</p>
                            </div>
                            <button onClick={() => setManagingMembersOrg(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            <MemberTable
                                members={currentOrgMembers}
                                organisation={{ 
                                    id: managingMembersOrg.id, 
                                    name: managingMembersOrg.name, 
                                    owner_id: managingMembersOrg.owner?.email || '', // simplified mapping
                                    created_at: managingMembersOrg.created_at 
                                }}
                                canManage={true}
                                removingId={removingMemberId}
                                onRemove={handleRemoveMember}
                                onUpdateRole={() => alert('Role updates in admin view coming soon')}
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
                            <Button variant="secondary" onClick={() => setManagingMembersOrg(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
