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
  Calendar,
  AlertTriangle,
  Users,
  Building2,
  Check,
  MoreHorizontal
} from 'lucide-react';
import { OrgRow } from './types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Table } from '../ui/Table';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOrg, setActiveOrg] = useState<OrgRow | null>(null);
  const [modalView, setModalView] = useState<'settings' | 'invite' | 'delete' | null>(null);
  
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
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Organisation</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Manage</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {orgsLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />Loading...</td></tr>
            ) : filteredOrgs.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No organisations found.</td></tr>
            ) : (
              filteredOrgs.map((org) => (
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
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900 font-medium">{org.owner?.full_name || '—'}</span>
                      <span className="text-xs text-slate-500">{org.owner?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {org.member_count ?? 0} members
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(org.created_at)}
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
              ))
            )}
          </tbody>
        </table>
      </Table>

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
    </div>
  );
};