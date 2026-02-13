import { Link } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import {
  ArrowRight,
  Package,
  ScanLine,
  BarChart3,
  Lock,
  CheckCircle,
} from 'lucide-react'
import { buildAccountsAuthUrl } from '../lib/authRedirect'

export const LandingPage = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-1.5">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Open-StoQR
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#security" className="hover:text-blue-600 transition-colors">
              Security
            </a>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <a
                  href={buildAccountsAuthUrl('signin')}
                  className="text-slate-600 hover:text-slate-900 font-medium text-sm"
                >
                  Log in
                </a>
                <a
                  href={buildAccountsAuthUrl('signup')}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm"
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            Smart inventory management for modern teams
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Inventory Control <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Made Simple
            </span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Track stock, scan barcodes, manage procurement, and run reports—all in one place.
            Open-StoQR gives you the tools to stay on top of your inventory without the hassle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <a
              href={buildAccountsAuthUrl('signup')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              Start Free <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href={buildAccountsAuthUrl('signin')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-slate-700 border border-slate-200 font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              Sign in
            </a>
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full filter blur-3xl transform mix-blend-multiply" />
          <div className="absolute top-20 right-20 w-96 h-96 bg-indigo-300 rounded-full filter blur-3xl opacity-70" />
          <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-blue-300 rounded-full filter blur-3xl opacity-70" />
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Everything You Need to Manage Inventory
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From products and variants to procurement and reporting—stay in control of your
              stock with powerful, easy-to-use tools.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Package,
                title: 'Products & Variants',
                desc: 'Organize inventory with folders, bundles, and variants. Track stock levels, expiry dates, and batch history.',
              },
              {
                icon: ScanLine,
                title: 'Barcode Scanning',
                desc: 'Quick scan for putaway, pick & pack, and cycle counts. Use your phone or webcam for instant stock updates.',
              },
              {
                icon: BarChart3,
                title: 'Reports & Valuation',
                desc: 'Profitability, turnover, and valuation reports. Audit trails and full transparency for your operations.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Proof / Security */}
      <div id="security" className="py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Security First Architecture</h2>
            <div className="space-y-4">
              {[
                'Row-level security for multi-tenant data isolation',
                'Role-based access control for your team',
                'Audit logs for inventory and procurement activity',
                'Secure cloud storage with Supabase',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <Lock className="w-12 h-12 text-blue-400 mb-6" />
              <h3 className="text-2xl font-bold mb-2">Enterprise Ready</h3>
              <p className="text-slate-400 mb-6">
                Built on Supabase for reliability and scale. Your data stays secure and
                accessible when you need it.
              </p>
              <a
                href={buildAccountsAuthUrl('signup')}
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-slate-200 rounded-lg p-1">
              <Package className="w-4 h-4 text-slate-600" />
            </div>
            <span className="font-semibold text-slate-700">Open-StoQR</span>
          </div>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Open-StoQR. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
