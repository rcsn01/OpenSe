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
} from 'lucide-react';
import { OrgRow } from './types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Table } from '../ui/Table'; // Reusing your existing UI wrapper

type MemberInviteState = { email: string; role: 'admin' | 'editor' | 'member' };

type OrgManagementListProps = {
  orgs: OrgRow[];
  orgsLoading: boolean;
  orgActionMsg: string | null;
  renaming: Record<string, string>;
  ownerChange: Record<string, string>;
  memberInvite: Record<string, MemberInviteState>;
  deletingOrgId: string | null;
  onRenameChange: (orgId: string, value: string) => void;
  onRenameSave: (orgId: string) => void;
  onOwnerChange: (orgId: string, value: string) => void;
  onOwnerSave: (orgId: string) => void;
  onMemberInviteChange: (orgId: string, value: MemberInviteState) => void;
  onInviteMember: (orgId: string) => void;
  onDeleteOrg: (orgId: string) => void;
  onManageMembers: (org: OrgRow) => void;
};

// Internal Modal Component for clean interaction
const Modal = ({ 
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
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

export const OrgManagementList: React.FC<OrgManagementListProps> = ({
  orgs,
  orgsLoading,
  orgActionMsg,
  renaming,
  ownerChange,
  memberInvite,
  deletingOrgId,
  onRenameChange,
  onRenameSave,
  onOwnerChange,
  onOwnerSave,
  onMemberInviteChange,
  onInviteMember,
  onDeleteOrg,
  onManageMembers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOrg, setActiveOrg] = useState<OrgRow | null>(null);
  const [modalView, setModalView] = useState<'settings' | 'invite' | 'delete' | null>(null);

  // Filter orgs based on search
  const filteredOrgs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        o.owner?.email?.toLowerCase().includes(term) ||
        o.id.includes(term)
    );
  }, [orgs, searchTerm]);

  // Handlers to open specific modals
  const openSettings = (org: OrgRow) => {
    setActiveOrg(org);
    setModalView('settings');
  };

  const openInvite = (org: OrgRow) => {
    setActiveOrg(org);
    setModalView('invite');
  };

  const openDelete = (org: OrgRow) => {
    setActiveOrg(org);
    setModalView('delete');
  };

  const closeModal = () => {
    setModalView(null);
    setActiveOrg(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Organisations</h2>
          <p className="text-sm text-slate-500">Manage {orgs.length} registered organisations</p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search organisations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {orgActionMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">{orgActionMsg}</div>
        </div>
      )}

      {/* Main Table */}
      <Table className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Organisation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {orgsLoading && orgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading data...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No organisations found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{org.name}</div>
                          <div className="text-xs text-slate-400 font-mono" title={org.id}>{org.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <Shield className="w-4 h-4 mr-2 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-medium">{org.owner?.full_name || 'Unknown'}</span>
                          <span className="text-slate-500 text-xs">{org.owner?.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => onManageMembers(org)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {org.member_count ?? 0} members
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {formatDate(org.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onManageMembers(org)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Manage Members"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openInvite(org)}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="Invite Members"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openSettings(org)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Settings (Rename / Transfer)"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDelete(org)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Organisation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Table>

      {/* --- Modals --- */}

      {/* Invite Modal */}
      <Modal
        isOpen={modalView === 'invite' && !!activeOrg}
        onClose={closeModal}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-md text-green-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <span>Invite to {activeOrg?.name}</span>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <Input
              prefix={<Mail className="w-4 h-4" />}
              placeholder="new.member@example.com"
              value={activeOrg ? (memberInvite[activeOrg.id]?.email || '') : ''}
              onChange={(e) => activeOrg && onMemberInviteChange(activeOrg.id, {
                email: e.target.value,
                role: memberInvite[activeOrg.id]?.role || 'member'
              })}
            />
            <p className="mt-1.5 text-xs text-slate-500">User must already have an account on the platform.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              className="w-full rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={activeOrg ? (memberInvite[activeOrg.id]?.role || 'member') : 'member'}
              onChange={(e) => activeOrg && onMemberInviteChange(activeOrg.id, {
                email: memberInvite[activeOrg.id]?.email || '',
                role: e.target.value as 'admin' | 'editor' | 'member'
              })}
            >
              <option value="member">Member</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button 
              onClick={() => {
                if (activeOrg) {
                  onInviteMember(activeOrg.id);
                  closeModal();
                }
              }}
            >
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal (Rename & Transfer) */}
      <Modal
        isOpen={modalView === 'settings' && !!activeOrg}
        onClose={closeModal}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md text-blue-700">
              <Settings className="w-5 h-5" />
            </div>
            <span>Edit {activeOrg?.name}</span>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Rename Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Rename Organisation</h4>
            <div className="flex gap-2">
              <Input 
                value={activeOrg ? (renaming[activeOrg.id] || '') : ''}
                onChange={(e) => activeOrg && onRenameChange(activeOrg.id, e.target.value)}
                placeholder="New organisation name"
              />
              <Button 
                variant="secondary"
                onClick={() => activeOrg && onRenameSave(activeOrg.id)}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Transfer Ownership Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Transfer Ownership</h4>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-md text-xs text-amber-800 mb-2">
              Warning: Transferring ownership is irreversible. The new owner will have full control.
            </div>
            <div className="flex gap-2">
              <Input 
                prefix={<Shield className="w-4 h-4" />}
                value={activeOrg ? (ownerChange[activeOrg.id] || '') : ''}
                onChange={(e) => activeOrg && onOwnerChange(activeOrg.id, e.target.value)}
                placeholder="new.owner@example.com"
              />
              <Button 
                variant="secondary"
                onClick={() => activeOrg && onOwnerSave(activeOrg.id)}
              >
                Transfer
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalView === 'delete' && !!activeOrg}
        onClose={closeModal}
        title={
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Delete Organisation</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-900">{activeOrg?.name}</span>? 
            This action cannot be undone and will remove all workflows and members associated with this organisation.
          </p>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button 
              variant="danger"
              disabled={deletingOrgId === activeOrg?.id}
              onClick={() => {
                if (activeOrg) {
                  onDeleteOrg(activeOrg.id);
                  closeModal();
                }
              }}
            >
              {deletingOrgId === activeOrg?.id ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Deleting...</>
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};