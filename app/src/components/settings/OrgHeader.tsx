import React from 'react';
import { Loader2 } from 'lucide-react';
import { Organisation } from './types';

export type OrgHeaderProps = {
  organisation: Organisation;
  membershipRole: 'owner' | 'admin' | 'editor' | 'member' | null;
  membersCount: number;
  initialLetter: string;
  canManage: boolean;
  editing: boolean;
  orgNameInput: string;
  savingOrg: boolean;
  onEditToggle: (value: boolean) => void;
  onOrgNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export const OrgHeader: React.FC<OrgHeaderProps> = ({
  organisation,
  membershipRole,
  membersCount,
  initialLetter,
  canManage,
  editing,
  orgNameInput,
  savingOrg,
  onEditToggle,
  onOrgNameChange,
  onSubmit,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
            {initialLetter}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{organisation.name}</h1>
            <p className="text-slate-500 text-sm">
              Created {organisation.created_at ? new Date(organisation.created_at).toLocaleDateString() : 'recently'} • {membersCount} members
            </p>
            {membershipRole && (
              <p className="text-xs text-slate-500 mt-1">You are an {membershipRole === 'owner' ? 'owner' : membershipRole}</p>
            )}
          </div>
        </div>

        {canManage && !editing && (
          <button
            onClick={() => onEditToggle(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
          >
            Edit Details
          </button>
        )}
      </div>

      {editing && (
        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
          <div>
            <label htmlFor="org-edit-name" className="block text-sm font-medium text-slate-700">Organisation name</label>
            <input
              id="org-edit-name"
              value={orgNameInput}
              onChange={(e) => onOrgNameChange(e.target.value)}
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
              onClick={() => onEditToggle(false)}
              className="text-sm text-slate-600 hover:text-slate-800 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
