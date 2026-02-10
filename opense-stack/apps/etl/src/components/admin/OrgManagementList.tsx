import React, { useMemo, useState } from 'react';
import {
  Search,
  Loader2,
  Trash2,
  Settings,
  UserPlus,
  Mail,
  Shield,
  X,
  Users,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Crown
} from 'lucide-react';
import { OrgRow } from './types';
import { Button, Input, Pagination } from '@repo/ui';
import { Table } from '../ui/Table';
import { UsageStatsBadge } from './UsageStatsBadge';
import { useOrgUsageStats } from '../../hooks/queries/useAdmin';

type OrgManagementListProps = {
  orgs: OrgRow[];
  orgsLoading: boolean;
  onRename: (id: string, name: string) => Promise<void>;
  onTransfer: (id: string, email: string) => Promise<void>;
  onInvite: (id: string, email: string, role: 'admin' | 'editor' | 'member') => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onManageMembers: (org: OrgRow) => void;
};

// Internal Modal
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const OrgManagementList: React.FC<OrgManagementListProps> = ({
  orgs,
  orgsLoading,
  onRename,
  onTransfer,
  onInvite,
  onDelete,
  onManageMembers,
}) => {
  // Fetch usage stats
  const { data: usageStatsMap, isLoading: usageLoading } = useOrgUsageStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOrg, setActiveOrg] = useState<OrgRow | null>(null);
  const [modalView, setModalView] = useState<'settings' | 'invite' | 'delete' | null>(null);

  // Pagination & Sort State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

  // Local State for Actions
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Values (Transient)
  const [renameValue, setRenameValue] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member');

  // Filter
  const filteredOrgs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return orgs;
    return orgs.filter(o =>
      o.name.toLowerCase().includes(term) ||
      o.owner?.email?.toLowerCase().includes(term)
    );
  }, [orgs, searchTerm]);

  // Sorting
  const sortedOrgs = useMemo(() => {
    if (!sortConfig) return filteredOrgs;

    return [...filteredOrgs].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof OrgRow];
      let bValue: any = b[sortConfig.key as keyof OrgRow];

      // Handle nested or special keys
      if (sortConfig.key === 'owner') {
        aValue = a.owner?.full_name || '';
        bValue = b.owner?.full_name || '';
      } else if (sortConfig.key === 'member_count') {
        aValue = a.member_count || 0;
        bValue = b.member_count || 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrgs, sortConfig]);

  // Pagination
  const paginatedOrgs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedOrgs.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedOrgs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedOrgs.length / itemsPerPage);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  // Open Handlers
  const openSettings = (org: OrgRow) => {
    setActiveOrg(org);
    setRenameValue(org.name);
    setTransferEmail('');
    setError(null);
    setModalView('settings');
  };

  const openInvite = (org: OrgRow) => {
    setActiveOrg(org);
    setInviteEmail('');
    setInviteRole('member');
    setError(null);
    setModalView('invite');
  };

  const openDelete = (org: OrgRow) => {
    setActiveOrg(org);
    setError(null);
    setModalView('delete');
  };

  const closeModal = () => {
    setModalView(null);
    setActiveOrg(null);
    setIsLoading(false);
  };

  // Submit Handlers
  const handleRenameSubmit = async () => {
    if (!activeOrg || !renameValue.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onRename(activeOrg.id, renameValue);
      closeModal();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!activeOrg || !transferEmail.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onTransfer(activeOrg.id, transferEmail);
      closeModal();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = async () => {
    if (!activeOrg || !inviteEmail.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onInvite(activeOrg.id, inviteEmail, inviteRole);
      closeModal();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeOrg) return;
    setIsLoading(true);
    setError(null);
    try {
      await onDelete(activeOrg.id);
      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Input
            prefix={<Search className="w-4 h-4" />}
            placeholder="Search organisations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <Table className="overflow-visible">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">Organisation <SortIcon columnKey="name" /></div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('owner')}
              >
                <div className="flex items-center">Owner <SortIcon columnKey="owner" /></div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('tier')}
              >
                <div className="flex items-center">Tier <SortIcon columnKey="tier" /></div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('subscription_status')}
              >
                <div className="flex items-center">Status <SortIcon columnKey="subscription_status" /></div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Usage
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('member_count')}
              >
                <div className="flex items-center">Size <SortIcon columnKey="member_count" /></div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Manage</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {orgsLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />Loading...</td></tr>
            ) : filteredOrgs.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No organisations found.</td></tr>
            ) : (
              paginatedOrgs.map((org) => {
                const usageStats = usageStatsMap?.get(org.id) || { success: 0, failed: 0, total: 0 };
                return (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-slate-900">{org.name}</div>
                          <div className="text-xs text-slate-400 font-mono" title={org.id}>ID: {org.id.split('-')[0]}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-900 font-medium">{org.owner?.full_name || '—'}</span>
                          <span className="text-xs text-slate-500">{org.owner?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.tier ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${org.tier === 'tier-3' ? 'bg-purple-100 text-purple-800' :
                          org.tier === 'tier-2' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                          {org.tier === 'tier-3' ? 'Enterprise' : org.tier === 'tier-2' ? 'Pro' : 'Starter'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.subscription_status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${org.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          org.subscription_status === 'past_due' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {org.subscription_status === 'active' ? 'Active' :
                            org.subscription_status === 'past_due' ? 'Past Due' :
                              org.subscription_status.charAt(0).toUpperCase() + org.subscription_status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <UsageStatsBadge
                        success={usageStats.success}
                        failed={usageStats.failed}
                        loading={usageLoading}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {org.member_count ?? 0} members
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onManageMembers(org)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          aria-label="Manage members"
                        >
                          <Users className="h-4 w-4" stroke="currentColor" fill="none" strokeWidth={1.8} />
                          Members
                        </button>
                        <button
                          type="button"
                          onClick={() => openInvite(org)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          aria-label="Invite member"
                        >
                          <UserPlus className="h-4 w-4" stroke="currentColor" fill="none" strokeWidth={1.8} />
                          Invite
                        </button>
                        <button
                          type="button"
                          onClick={() => openSettings(org)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          aria-label="Organisation settings"
                        >
                          <Settings className="h-4 w-4" stroke="currentColor" fill="none" strokeWidth={1.8} />
                          Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(org)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50"
                          aria-label="Delete organisation"
                        >
                          <Trash2 className="h-4 w-4" stroke="currentColor" fill="none" strokeWidth={1.8} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

      </Table>

      {
        !orgsLoading && filteredOrgs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredOrgs.length}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        )
      }

      {/* --- Modals --- */}

      {/* Invite Modal */}
      <Modal isOpen={modalView === 'invite'} onClose={closeModal} title={<div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-green-600" />Invite to {activeOrg?.name}</div>}>
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input prefix={<Mail className="w-4 h-4" />} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select className="w-full rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
              <option value="member">Member</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleInviteSubmit} disabled={isLoading}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}</Button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={modalView === 'settings'} onClose={closeModal} title={<div className="flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" />Settings: {activeOrg?.name}</div>}>
        <div className="space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

          <div className="space-y-3 pb-6 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900">Rename</h4>
            <div className="flex gap-2">
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Organisation name" />
              <Button onClick={handleRenameSubmit} disabled={isLoading || !renameValue.trim() || renameValue === activeOrg?.name}>Save</Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Transfer Ownership</h4>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-md text-xs text-amber-800">
              <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" /> Irreversible action. The new owner will have full control.
            </div>
            <div className="flex gap-2">
              <Input prefix={<Shield className="w-4 h-4" />} value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} placeholder="new.owner@example.com" />
              <Button variant="secondary" onClick={handleTransferSubmit} disabled={isLoading || !transferEmail.trim()}>Transfer</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modalView === 'delete'} onClose={closeModal} title={<div className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" />Delete Organisation</div>}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{activeOrg?.name}</strong>? This will remove all members, workflows, and data associated with it.
          </p>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSubmit} disabled={isLoading}>{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}</Button>
          </div>
        </div>
      </Modal>
    </div >
  );
};