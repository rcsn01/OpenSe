import { useEffect } from 'react'
import { LandingPage as EtlLandingPage } from '../../../etl/src/pages/LandingPage'
import { setActiveLandingContext } from '../lib/authRedirect'

export const OpenEtlLandingPage = () => {
  useEffect(() => {
    setActiveLandingContext('etl')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="opense-theme-etl">
      <EtlLandingPage />
    </div>
  )
}