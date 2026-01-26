import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Trash2, Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
    fetchProfileFullName,
    updateAuthFullName,
    updatePassword,
    updateProfileFullName,
} from '../../api/auth';

export const UserSettingsPage = () => {
    const { user, isSuperAdmin } = useAuth();
    
    // State
    const [fullName, setFullName] = useState('');
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Load initial profile data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const name = await fetchProfileFullName(user.id);
            if (name) setFullName(name);
        };
        fetchProfile();
    }, [user]);

    // Handler: Update Profile
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoadingProfile(true);
        setMessage(null);

        try {
            await updateProfileFullName(user.id, fullName);
            await updateAuthFullName(fullName);

            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoadingProfile(false);
        }
    };

    // Handler: Update Password
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        
        setLoadingPassword(true);
        setMessage(null);

        try {
            await updatePassword(password);
            
            setMessage({ type: 'success', text: 'Password updated successfully.' });
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">User Settings</h1>
                <p className="text-slate-500 text-sm">Manage your personal account details and security.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-md flex items-center gap-2 text-sm ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                    {message.text}
                </div>
            )}

            {/* Section 1: Profile Details */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <User className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <Input 
                            value={user?.email || ''} 
                            disabled 
                            className="bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">To change your email, please contact support.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <Input 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" disabled={loadingProfile}>
                            {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                            Save Profile
                        </Button>
                    </div>
                </form>
            </div>

            {/* Section 2: Security */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">Security</h2>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <Input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                        <Input 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" variant="secondary" disabled={loadingPassword || !password}>
                            {loadingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                            Update Password
                        </Button>
                    </div>
                </form>
            </div>

            {/* Section 3: Danger Zone */}
            <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-700" />
                    <h3 className="text-sm font-bold text-red-800">Danger Zone</h3>
                </div>
                <div className="p-6 bg-white flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-900">Delete Account</p>
                        <p className="text-sm text-slate-500">
                            Permanently delete your account and all personal data. This action cannot be undone.
                        </p>
                    </div>
                    <Button variant="danger" onClick={() => alert("Implement delete logic here using supbase.rpc or auth.admin.deleteUser")}>
                        Delete Account
                    </Button>
                </div>
            </div>

            {/* Super Admin */}
            {isSuperAdmin && (
                <div className="pt-2">
                    <Link to="/admin">
                        <Button variant="secondary">Admin Panel</Button>
                    </Link>
                </div>
            )}
        </div>
    );
};