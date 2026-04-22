import { useEffect } from 'react'
import { LandingPage as StoqrLandingPage } from '../../../stoqr/src/pages/LandingPage'
import { OpenSeLandingNavbar } from '../components/OpenSeLandingNavbar'
import { setActiveLandingContext } from '../lib/authRedirect'

export const OpenStoqrLandingPage = () => {
  useEffect(() => {
    setActiveLandingContext('stoqr')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="opense-theme-stoqr">
      <StoqrLandingPage navbar={<OpenSeLandingNavbar />} />
    </div>
  )
}