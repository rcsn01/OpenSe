import React from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';

export const PaymentSettings = () => {
  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscription & Billing</h2>
          <p className="text-slate-500 text-sm">Manage your organisation's plan and payment methods.</p>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6 mt-6">
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-medium">Your organisation is currently on the Enterprise Plan.</span>
        </div>
        
        <p className="mt-6 text-slate-600 text-sm italic">
          Billing management integration is coming soon. Please contact support for invoice requests.
        </p>
      </div>
    </div>
  );
};