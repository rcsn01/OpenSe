import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Loader2,
  ShieldAlert,
  User,
  Mail,
  Plus,
  X,
  Key,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminUsers } from '../../hooks/queries/useAdmin';
import { updateUserProfile } from '../../api/admin'; // Add import
import { Input } from '../ui/Input';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Pagination } from '../ui/Pagination';

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at?: string;
  super_admin_members?: { user_id: string }[];
};

// Internal Modal for Add/Reset actions
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

export const UserManagementList = () => {
  const queryClient = useQueryClient();
  const { data: usersData = [], isLoading: loading, error: queryError } = useAdminUsers();
  const users = usersData as Profile[];
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Sort State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });


  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Form State
  const [newUser, setNewUser] = useState({ email: '', fullName: '', password: '' });
  const [resetPassword, setResetPassword] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to completely delete this user and their login access?')) return;

    setActionLoading(true);
    try {
      // Call the new admin RPC to clean up auth.users + profiles
      const { error } = await supabase.rpc('delete_user_admin', { target_user_id: userId });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setSuccessMsg('User deleted successfully');
    } catch (err: any) {
      setError('Failed to delete user: ' + err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      const { data: _newId, error } = await supabase.rpc('create_user_admin', {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.fullName,
      });

      if (error) throw error;

      setSuccessMsg(`User ${newUser.email} created successfully.`);
      setIsAddModalOpen(false);
      setNewUser({ email: '', fullName: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('reset_password_admin', {
        target_user_id: selectedUser.id,
        new_password: resetPassword,
      });

      if (error) throw error;

      setSuccessMsg(`Password for ${selectedUser.email} reset successfully.`);
      setIsResetModalOpen(false);
      setResetPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    setError(null);

    try {
      await updateUserProfile(selectedUser.id, { full_name: editFullName });

      setSuccessMsg(`User ${selectedUser.email} updated successfully.`);
      setIsEditModalOpen(false);
      setEditFullName('');
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || '');
    setIsEditModalOpen(true);
  };

  const openResetModal = (user: Profile) => {
    setSelectedUser(user);
    setResetPassword('');
    setIsResetModalOpen(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      (u.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (u.full_name?.toLowerCase() || '').includes(search.toLowerCase())
    );
  }, [users, search]);

  // Sorting
  const sortedUsers = useMemo(() => {
    if (!sortConfig) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Profile];
      let bValue: any = b[sortConfig.key as keyof Profile];

      // Handle nested or special keys
      if (sortConfig.key === 'role') {
        aValue = (a.super_admin_members?.length ?? 0) > 0 ? 1 : 0;
        bValue = (b.super_admin_members?.length ?? 0) > 0 ? 1 : 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
          <p className="text-sm text-slate-500">View and manage all registered users across the platform</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              prefix={<Search className="w-4 h-4" />}
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200 flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <Table>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('full_name')}
              >
                <div className="flex items-center">User <SortIcon columnKey="full_name" /></div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('role')}
              >
                <div className="flex items-center">Role <SortIcon columnKey="role" /></div>
              </th>
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
              paginatedUsers.map((user) => {
                const isSuperAdmin = (user.super_admin_members?.length ?? 0) > 0;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 group transition-colors">
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
                      {isSuperAdmin ? (
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
                      {!isSuperAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            title="Edit User"
                            onClick={() => openEditModal(user)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Trash2 className="w-4 h-4 hidden" /> {/* Hack to reuse style or just use Pencil */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil w-4 h-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            title="Reset Password"
                            onClick={() => openResetModal(user)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            title="Delete User"
                            onClick={() => handleDelete(user.id)}
                            disabled={actionLoading}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Table>

      {
        !loading && filteredUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        )
      }

      {/* --- Add User Modal --- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md text-blue-700">
              <Plus className="w-5 h-5" />
            </div>
            <span>Create New User</span>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <Input
              required
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <Input
              type="email"
              required
              prefix={<Mail className="w-4 h-4" />}
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <Input
              type="password"
              required
              minLength={6}
              prefix={<Key className="w-4 h-4" />}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Reset Password Modal --- */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 rounded-md text-amber-700">
              <Key className="w-5 h-5" />
            </div>
            <span>Reset Password</span>
          </div>
        }
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter a new password for <span className="font-semibold text-slate-900">{selectedUser?.email}</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <Input
              type="password"
              required
              minLength={6}
              prefix={<Key className="w-4 h-4" />}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </div>
        </form>
      </Modal>


      {/* --- Edit User Modal --- */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil w-5 h-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
            </div>
            <span>Edit User</span>
          </div>
        }
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <Input
              required
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};