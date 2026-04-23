import type { ReactNode } from 'react'
import { OpenSeLandingNavbar } from './OpenSeLandingNavbar'

interface MarketingPageFrameProps {
  background?: ReactNode
  children: ReactNode
}

export const MarketingPageFrame = ({ background, children }: MarketingPageFrameProps) => {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] [--landing-navbar-transparent-foreground:var(--color-foreground)]">
      {background ? <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">{background}</div> : null}
      <OpenSeLandingNavbar />
      <main>{children}</main>
    </div>
  )
}