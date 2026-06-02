import React from 'react';
import { Building2, Calendar, Shield, Users, CreditCard, Edit3 } from 'lucide-react';
import { Organisation } from '../settings/types';
import { OrgSimple } from '../../types/organisation';
import clsx from 'clsx';

type ModernOrgHeaderProps = {
  organisation: Organisation & Partial<OrgSimple>;
  membersCount: number;
  userRole: string;
  onEdit: () => void;
};

export const ModernOrgHeader: React.FC<ModernOrgHeaderProps> = ({ 
  organisation, 
  membersCount, 
  userRole,
  onEdit 
}) => {
  const tier = organisation.tier || 'tier-1';
  const tierName = tier === 'tier-3' ? 'Enterprise' : tier === 'tier-2' ? 'Pro' : 'Starter';
  
  const tierStyles = tier === 'tier-3' 
    ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
    : tier === 'tier-2' 
      ? 'bg-purple-100 text-purple-700 border-purple-200' 
      : 'bg-blue-100 text-blue-700 border-blue-200';

  const logoGradient = tier === 'tier-3'
    ? 'from-slate-700 to-black'
    : 'from-blue-600 to-indigo-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Removed the black banner div here */}

      <div className="p-8"> {/* Changed padding to uniform p-8 */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex items-center gap-6">
            {/* Logo Box */}
            <div className="h-20 w-20 bg-white rounded-xl shadow-sm ring-1 ring-slate-100 shrink-0">
              <div className={clsx("h-full w-full rounded-xl flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-br", logoGradient)}>
                {organisation.name.charAt(0).toUpperCase()}
              </div>
            </div>
            
            {/* Title & Meta */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{organisation.name}</h1>
                <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide", tierStyles)}>
                  {tierName}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> 
                    Est. {new Date(organisation.created_at || Date.now()).getFullYear()}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1.5 capitalize">
                    <Shield className="w-4 h-4 text-slate-400" /> 
                    {userRole} Role
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
             <button 
               onClick={onEdit}
               className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
             >
               <Edit3 className="w-4 h-4" />
               Edit Details
             </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            <StatItem icon={Users} label="Total Members" value={membersCount} />
            <StatItem icon={Shield} label="Security Status" value="Active" tone="green" /> 
            <StatItem icon={CreditCard} label="Billing Status" value="Good Standing" />
            <StatItem icon={Building2} label="Seat Limit" value={tier === 'tier-1' ? '5' : tier === 'tier-2' ? '15' : '50'} />
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ icon: Icon, label, value, tone }: any) => (
  <div className="flex items-center gap-3 p-4 bg-white hover:bg-slate-50/50 transition-colors">
    <div className={clsx("p-2 rounded-lg", tone === 'green' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500")}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={clsx("text-base font-bold", tone === 'green' ? "text-emerald-700" : "text-slate-900")}>{value}</p>
    </div>
  </div>
);