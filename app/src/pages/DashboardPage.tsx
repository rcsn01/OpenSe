import React from 'react';
import { useOutletContext, Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OrgSimple } from '../types/organisation';
import clsx from 'clsx';
import { User, Building2 } from 'lucide-react';

type DashboardContextType = { currentOrg: OrgSimple | null };

export const DashboardPage = () => {
  const { user } = useAuth();
  const { currentOrg } = useOutletContext<DashboardContextType>();

  // Pass context down to Outlet (WorkflowList)
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.user_metadata?.full_name || 'Guest'}</h1>
          <p className="text-slate-500 mt-1">Manage your data workflows and automations.</p>
        </div>
      </div>

      {/* URL-based Tabs */}
      <div className="flex space-x-1 rounded-xl bg-slate-100 p-1 mb-8 w-fit">
        <NavLink
          to="personal"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
              isActive
                ? 'bg-white text-blue-700 shadow'
                : 'text-slate-600 hover:bg-white/[0.12] hover:text-slate-800'
            )
          }
        >
          <User className="w-4 h-4" />
          Personal
        </NavLink>
        <NavLink
          to="org"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium leading-5 ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
              isActive
                ? 'bg-white text-blue-700 shadow'
                : 'text-slate-600 hover:bg-white/[0.12] hover:text-slate-800'
            )
          }
        >
          <Building2 className="w-4 h-4" />
          {currentOrg ? currentOrg.name : 'Organization'}
        </NavLink>
      </div>

      <Outlet context={{ currentOrg }} />
    </div>
  );
};