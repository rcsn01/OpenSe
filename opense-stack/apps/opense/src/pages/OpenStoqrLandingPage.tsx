import { useEffect } from 'react'
import { LANDING_NAVBAR_OFFSET } from '@repo/ui'
import { OpenSeLandingNavbar } from '../components/OpenSeLandingNavbar'
import { setActiveLandingContext } from '../lib/authRedirect'

export const OpenStoqrLandingPage = () => {
  useEffect(() => {
    setActiveLandingContext('stoqr')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white [--landing-navbar-transparent-foreground:var(--color-background)]">
      <OpenSeLandingNavbar />

      <main
        className="mx-auto flex min-h-screen max-w-6xl items-center px-6 pb-16"
        style={{ paddingTop: `calc(${LANDING_NAVBAR_OFFSET} + 2rem)` }}
      >
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/45">Holding Page</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">Open-StoQR</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            This route is intentionally black for now while the OpenSe landing surface is being rebuilt.
          </p>
        </section>
      </main>
    </div>
  )
}