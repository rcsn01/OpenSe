import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  ChevronDown, 
  LogOut, 
  User, 
  Menu,
  X
} from 'lucide-react';
import { clsx } from 'clsx';

export const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Settings', href: '/settings/org', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Organization Switcher */}
          <div className="p-4 bg-slate-950">
            <button className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 focus:outline-none">
              <span className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs">P</div>
                Pearl Corp
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className={clsx(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Guest User</p>
                <p className="text-xs text-slate-400">guest@example.com</p>
              </div>
              <button className="ml-auto flex-shrink-0 p-1 text-slate-400 hover:text-white">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 p-4 z-40">
         <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md bg-slate-800 text-white">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
