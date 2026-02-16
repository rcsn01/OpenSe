import { Outlet } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

/**
 * Minimal layout for onboarding flow (no sidebar).
 */
export const OnboardingLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-slate-900">OpenSe Accounts</span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
