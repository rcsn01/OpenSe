import React, { useState } from 'react';
import { Check, CreditCard, ShieldCheck, Zap, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { OrgSimple } from '../../types/organisation';
import clsx from 'clsx';
import { updateOrganisationTier } from '../../api/organisations';
import { useQueryClient } from '@tanstack/react-query';

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

export const PaymentSettings = ({ organisation }: { organisation: OrgSimple }) => {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currentTierId = organisation.tier || 'tier-1';

  const handleSwitchPlan = async (tierId: string) => {
    setUpdating(tierId);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateOrganisationTier(organisation.id, tierId as any);

      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      // Invalidate queries to refresh org data
      await queryClient.invalidateQueries({ queryKey: ['userOrganisations'] });
      setSuccess(result.message || `Successfully switched to ${TIERS.find(t => t.id === tierId)?.name} plan`);
      console.log(`Switched to ${tierId}`, result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to switch plan. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Subscription & Billing</h2>
            <p className="text-slate-500 text-sm">Manage your organisation's plan and seat limits.</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 mb-6">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-medium">
              Your organisation is currently on the <span className="font-bold">{TIERS.find(t => t.id === currentTierId)?.name} Plan</span>.
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100 mb-6">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 mb-6">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          <h3 className="font-semibold text-slate-900 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
              const isCurrent = currentTierId === tier.id;
              return (
                <div
                  key={tier.id}
                  className={clsx(
                    "relative rounded-xl border-2 p-6 transition-all",
                    isCurrent ? "border-blue-600 bg-blue-50/10 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  )}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-sm">
                      CURRENT PLAN
                    </div>
                  )}
                  <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-lg text-slate-900">{tier.name}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-bold text-slate-900">${tier.price}</span>
                      <span className="text-slate-500">/mo</span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {tier.seats} Seats Included
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {tier.features.map((feature) => (
                        <li key={feature} className="text-sm text-slate-600 flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <button disabled className="w-full py-2 bg-slate-100 text-slate-400 font-medium rounded-lg text-sm cursor-not-allowed">
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSwitchPlan(tier.id)}
                        disabled={!!updating}
                        className="w-full py-2 bg-slate-900 text-white font-medium rounded-lg text-sm hover:bg-slate-800 transition-colors disabled:opacity-70 flex justify-center items-center"
                      >
                        {updating === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Switch Plans'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};