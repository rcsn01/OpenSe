import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Message } from './types';

export type CreateOrgFormProps = {
  orgName: string;
  ownerEmail: string;
  loading: boolean;
  message: Message;
  onOrgNameChange: (value: string) => void;
  onOwnerEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export const CreateOrgForm: React.FC<CreateOrgFormProps> = ({
  orgName,
  ownerEmail,
  loading,
  message,
  onOrgNameChange,
  onOwnerEmailChange,
  onSubmit,
}) => {
  return (
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

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Organisation Name</label>
          <input
            type="text"
            required
            value={orgName}
            onChange={(e) => onOrgNameChange(e.target.value)}
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
            onChange={(e) => onOwnerEmailChange(e.target.value)}
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
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create & Assign Organisation'}
        </button>
      </form>
    </div>
  );
};
