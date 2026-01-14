import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { OrgRow } from './types';

type MemberInviteState = { email: string; role: 'admin' | 'member' };

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
}) => {
  const orgsEmpty = (orgs || []).length === 0;

  return (
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
                    onClick={() => onDeleteOrg(org.id)}
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
                      onChange={(e) => onRenameChange(org.id, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                    <button
                      onClick={() => onRenameSave(org.id)}
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
                      onChange={(e) => onOwnerChange(org.id, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="owner@example.com"
                    />
                    <button
                      onClick={() => onOwnerSave(org.id)}
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
                      onChange={(e) => onMemberInviteChange(org.id, {
                        email: e.target.value,
                        role: memberInvite[org.id]?.role || 'member',
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="user@example.com"
                    />
                    <select
                      value={memberInvite[org.id]?.role || 'member'}
                      onChange={(e) => onMemberInviteChange(org.id, {
                        email: memberInvite[org.id]?.email || '',
                        role: e.target.value as 'admin' | 'member',
                      })}
                      className="px-2 py-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => onInviteMember(org.id)}
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
  );
};
