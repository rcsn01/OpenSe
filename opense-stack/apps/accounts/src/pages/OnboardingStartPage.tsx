import { Navigate } from 'react-router-dom'
import { buildPathWithQuery } from '../lib/redirect'

export const OnboardingStartPage = () => {
  return <Navigate to={buildPathWithQuery('/onboarding/invitations')} replace />
}
