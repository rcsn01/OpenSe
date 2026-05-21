import type { AppCode, MemberRole, PendingInvite } from '../api/onboarding'

export const FREE_TIER_ONBOARDING_SEATS = 5

export const onboardingAppOptions: Array<{ code: AppCode; name: string }> = [
  { code: 'etl', name: 'ETL' },
  { code: 'stoqr', name: 'StoQR' },
]

export const onboardingSizeOptions = [
  { value: '1-5', label: '1-5 people' },
  { value: '6-20', label: '6-20 people' },
  { value: '21-50', label: '21-50 people' },
  { value: '51+', label: '51+ people' },
]

export const validateOnboardingOrganisationForm = ({
  orgName,
  estimatedPeople,
  selectedApps,
}: {
  orgName: string
  estimatedPeople: string
  selectedApps: AppCode[]
}) => {
  if (!orgName.trim()) return 'Organisation name is required.'
  if (!estimatedPeople) return 'Please choose an estimated team size.'
  if (selectedApps.length === 0) return 'Select at least one app for free-tier seats.'
  return null
}

export const getOnboardingAppSeatSummary = (selectedApps: AppCode[]) => {
  const selected = new Set(selectedApps)
  return onboardingAppOptions.map((app) => ({
    ...app,
    selected: selected.has(app.code),
    seats: selected.has(app.code) ? FREE_TIER_ONBOARDING_SEATS : 0,
  }))
}

export const getOnboardingSelectedSeatTotal = (selectedApps: AppCode[]) => {
  return getOnboardingAppSeatSummary(selectedApps).reduce((total, app) => total + app.seats, 0)
}

export const parseOnboardingInviteEmails = (value: string) => {
  const entries = value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)

  const seen = new Set<string>()
  const emails: string[] = []
  const duplicateEmails: string[] = []

  for (const email of entries) {
    if (seen.has(email)) {
      if (!duplicateEmails.includes(email)) {
        duplicateEmails.push(email)
      }
      continue
    }
    seen.add(email)
    emails.push(email)
  }

  return {
    emails,
    duplicateEmails,
    duplicateCount: entries.length - emails.length,
    inputCount: entries.length,
  }
}

export const canInviteDuringOnboarding = (role: MemberRole | null | undefined) => {
  return role === 'owner' || role === 'admin'
}

export const getOnboardingCompletedFallbackPath = () => '/account/profile'

export const getInvitationAcceptedPath = () => '/onboarding/invite-members'

export const getInvitationDeclinedPath = (remainingInvites: PendingInvite[]) => {
  return remainingInvites.length === 0 ? '/onboarding/create-organisation' : null
}
