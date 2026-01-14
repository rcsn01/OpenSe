import React, { useEffect, useState } from 'react';
import {
  Search,
  Trash2,
  Loader2,
  ShieldAlert,
  User,
  Mail,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Input } from '../ui/Input';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at?: string;
  is_super_admin?: boolean;
};

export const UserManagementList = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user? This removes their profile data but may not delete the account login if not cascaded.')) return;

    setDeletingId(userId);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.full_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
          <p className="text-sm text-slate-500">View and manage all registered users across the platform</p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            prefix={<Search className="w-4 h-4" />}
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <Table>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{user.full_name || 'No Name'}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_super_admin ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Super Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge label="Active" tone="success" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {!user.is_super_admin && (
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingId === user.id}
                        className="text-slate-400 hover:text-red-600"
                      >
                        {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Table>
    </div>
  );
};
