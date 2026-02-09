
import { useEffect, useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { OrgInvite } from '../../types/organisation';
import { getPendingInvites, acceptInvite, rejectInvite } from '../../api/organisations';

export const InvitesList = ({ onAccepted }: { onAccepted: () => void }) => {
    const [invites, setInvites] = useState<OrgInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        getPendingInvites().then(setInvites).finally(() => setLoading(false));
    }, []);

    const handleAccept = async (id: string) => {
        setProcessingId(id);
        try {
            await acceptInvite(id);
            onAccepted();
        } catch (error) {
            console.error(error);
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await rejectInvite(id);
            setInvites(prev => prev.filter(i => i.id !== id));
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    }

    if (invites.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-6 h-6 text-slate-300" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">No pending invites</h3>
                <p className="text-sm text-slate-500 mt-1">You haven't been invited to any organisations yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {invites.map((invite) => (
                <div key={invite.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-semibold">
                            {invite.org_name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">{invite.org_name}</h3>
                            <p className="text-sm text-slate-500">Invited by {invite.inviter_name} • <span className="capitalize">{invite.role}</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleReject(invite.id)}
                            disabled={!!processingId}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                            title="Decline"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleAccept(invite.id)}
                            disabled={!!processingId}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {processingId === invite.id && <Loader2 className="w-4 h-4 animate-spin" />}
                            Accept
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
