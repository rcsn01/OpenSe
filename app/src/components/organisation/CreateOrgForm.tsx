
import React, { useState } from 'react';
import { Check, Building2, Loader2, Sparkles } from 'lucide-react';
import { createOrganisation } from '../../api/organisations';
import clsx from 'clsx';

const TIERS = [
    {
        id: 'tier-1',
        name: 'Starter',
        price: 15,
        seats: 5,
        features: ['5 Team Members', 'Basic Analytics', 'Standard Support'],
        color: 'blue'
    },
    {
        id: 'tier-2',
        name: 'Pro',
        price: 40,
        seats: 15,
        popular: true,
        features: ['15 Team Members', 'Advanced Analytics', 'Priority Support', 'Custom Roles'],
        color: 'purple'
    },
    {
        id: 'tier-3',
        name: 'Enterprise',
        price: 90,
        seats: 50,
        features: ['50 Team Members', 'Custom Analytics', '24/7 Support', 'SSO', 'Audit Logs'],
        color: 'indigo'
    }
] as const;

export const CreateOrgForm = ({ onCreated }: { onCreated: () => void }) => {
    const [selectedTier, setSelectedTier] = useState<typeof TIERS[number]['id']>('tier-2');
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setCreating(true);
        setError(null);
        try {
            await createOrganisation(name.trim(), selectedTier);
            // In a real app we might redirect to Stripe here
            onCreated();
        } catch (err: any) {
            setError(err?.message || 'Failed to create organisation');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <h2 className="text-2xl font-semibold text-slate-900">Create your organisation</h2>
                <p className="text-slate-500 mt-2">Choose the perfect plan for your team and get started.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {TIERS.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                        <div
                            key={tier.id}
                            onClick={() => setSelectedTier(tier.id)}
                            className={clsx(
                                "relative rounded-xl border-2 p-6 cursor-pointer transition-all hover:scale-[1.02]",
                                isSelected ? "border-blue-600 bg-blue-50/10 shadow-lg ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md",
                            )}
                        >
                            {tier.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    MOST POPULAR
                                </div>
                            )}
                            <div className="flex flex-col h-full">
                                <h3 className={clsx("font-semibold text-lg", isSelected ? "text-blue-700" : "text-slate-900")}>{tier.name}</h3>
                                <div className="mt-4 mb-6">
                                    <span className="text-4xl font-bold text-slate-900">${tier.price}</span>
                                    <span className="text-slate-500">/mo</span>
                                </div>
                                <div className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4 text-slate-400" />
                                    {tier.seats} Seats Included
                                </div>
                                <ul className="space-y-3 mb-8 flex-1">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="text-sm text-slate-600 flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <div className={clsx(
                                    "w-full py-2 rounded-lg text-sm font-medium text-center transition-colors",
                                    isSelected ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600"
                                )}>
                                    {isSelected ? 'Selected' : 'Select Plan'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    Organisation Details
                </h3>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label htmlFor="org-name" className="block text-sm font-medium text-slate-700 mb-1">
                            Organisation Name
                        </label>
                        <input
                            id="org-name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={creating || !name.trim()}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Organisation
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

const UsersIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
