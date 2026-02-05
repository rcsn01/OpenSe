import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Filter, MoreHorizontal, Mail, X, Loader2, ShieldCheck, User } from 'lucide-react';
import { Member, Organisation } from '../settings/types';
import { MemberTable } from '../settings/MemberTable'; // Reusing your existing table logic, but wrapped
import { Button } from '../ui/Button'; // Assuming you have this
import { Input } from '../ui/Input';   // Assuming you have this

type ModernTeamSettingsProps = {
  organisation: Organisation;
  members: Member[];
  canManageTeam: boolean;
  
  // Invite Logic
  inviteEmail: string;
  inviteRole: 'admin' | 'editor' | 'member';
  inviting: boolean;
  inviteError: string | null;
  onInviteEmailChange: (val: string) => void;
  onInviteRoleChange: (role: 'admin' | 'editor' | 'member') => void;
  onInviteSubmit: (e: React.FormEvent) => void;
  
  // Member Logic
  removingId: string | null;
  onRemoveMember: (member: Member) => void;
  onUpdateRole: (memberId: string, newRole: 'admin' | 'editor' | 'member') => void;
};

export const ModernTeamSettings: React.FC<ModernTeamSettingsProps> = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'member'>('all');

  // Local filtering
  const filteredMembers = useMemo(() => {
    return props.members.filter(m => {
      const matchesSearch = (m.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (m.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [props.members, searchTerm, roleFilter]);

  const handleInviteSubmit = (e: React.FormEvent) => {
    props.onInviteSubmit(e);
    // Note: You might want to close modal only on success, handled in parent
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="editor">Editors</option>
            <option value="member">Members</option>
          </select>
        </div>

        {props.canManageTeam && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="w-full sm:w-auto shadow-md shadow-blue-500/20">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Table Area */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <MemberTable 
          members={filteredMembers}
          organisation={props.organisation}
          canManage={props.canManageTeam}
          removingId={props.removingId}
          onRemove={props.onRemoveMember}
          onUpdateRole={props.onUpdateRole}
        />
        {filteredMembers.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <User className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No members found matching your search.</p>
          </div>
        )}
      </div>

      {/* Invite Modal Overlay */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {props.inviteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex gap-2 items-start">
                  <div className="mt-0.5 min-w-[4px] h-4 bg-red-500 rounded-full" />
                  {props.inviteError}
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="colleague@company.com"
                      value={props.inviteEmail}
                      onChange={(e) => props.onInviteEmailChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['member', 'editor', 'admin'].map((role) => (
                      <div 
                        key={role}
                        onClick={() => props.onInviteRoleChange(role as any)}
                        className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${
                          props.inviteRole === role 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-sm font-semibold capitalize">{role}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {props.inviteRole === 'admin' ? 'Full access to settings and billing.' : 
                     props.inviteRole === 'editor' ? 'Can create and edit workflows.' : 
                     'Can run workflows and view results.'}
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={props.inviting}>
                    {props.inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};