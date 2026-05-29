import { describe, expect, it } from 'vitest'
import type { OnboardingStatus, PendingInvite } from '../../api/onboarding'
import {
  canInviteDuringOnboarding,
  getInvitationAcceptedPath,
  getInvitationDeclinedPath,
  getOnboardingAppSeatSummary,
  getOnboardingPathForStatus,
  getOnboardingSelectedSeatTotal,
  getOnboardingStatusScope,
  parseOnboardingInviteEmails,
  shouldSkipInviteMembersStep,
  validateOnboardingOrganisationForm,
} from '../onboardingUi'

const invite = (id: string): PendingInvite => ({
  id,
  orgId: `org-${id}`,
  orgName: `Org ${id}`,
  inviterName: 'Owner',
  role: 'member',
  createdAt: '2026-05-21T00:00:00.000Z',
})

describe('onboarding UI helpers', () => {
  it('validates create organisation form requirements', () => {
    expect(validateOnboardingOrganisationForm({
      orgName: '   ',
      estimatedPeople: '1-5',
      selectedApps: ['etl'],
    })).toBe('Organisation name is required.')

    expect(validateOnboardingOrganisationForm({
      orgName: 'Acme',
      estimatedPeople: '',
      selectedApps: ['etl'],
    })).toBe('Please choose an estimated team size.')

    expect(validateOnboardingOrganisationForm({
      orgName: 'Acme',
      estimatedPeople: '1-5',
      selectedApps: [],
    })).toBe('Select at least one app for free-tier seats.')
  })

  it('uses instance policy for selected app free-tier seats', () => {
    expect(getOnboardingAppSeatSummary(['etl'], 5)).toMatchObject([
      { code: 'etl', seats: 5, selected: true },
      { code: 'stoqr', seats: 0, selected: false },
    ])
    expect(getOnboardingSelectedSeatTotal(['etl', 'stoqr'], 5)).toBe(10)
    expect(getOnboardingSelectedSeatTotal(['etl'], null)).toBeNull()
  })

  it('normalizes invite preview emails and reports duplicates', () => {
    const parsed = parseOnboardingInviteEmails(' MEMBER@Example.com, member@example.com\nSecond@Example.com; second@example.com ')

    expect(parsed.emails).toEqual(['member@example.com', 'second@example.com'])
    expect(parsed.duplicateEmails).toEqual(['member@example.com', 'second@example.com'])
    expect(parsed.duplicateCount).toBe(2)
    expect(parsed.inputCount).toBe(4)
  })

  it('enables onboarding invite controls only for owners and admins', () => {
    expect(canInviteDuringOnboarding('owner')).toBe(true)
    expect(canInviteDuringOnboarding('admin')).toBe(true)
    expect(canInviteDuringOnboarding('member')).toBe(false)
    expect(canInviteDuringOnboarding('editor')).toBe(false)
    expect(canInviteDuringOnboarding(null)).toBe(false)
  })

  it('skips invite-members only for non-inviting membership roles', () => {
    expect(shouldSkipInviteMembersStep('member')).toBe(true)
    expect(shouldSkipInviteMembersStep('editor')).toBe(true)
    expect(shouldSkipInviteMembersStep('owner')).toBe(false)
    expect(shouldSkipInviteMembersStep('admin')).toBe(false)
    expect(shouldSkipInviteMembersStep(null)).toBe(false)
  })

  it('keeps invitation choice navigation decisions stable', () => {
    expect(getInvitationAcceptedPath()).toBe('/onboarding/invite-members')
    expect(getInvitationDeclinedPath([invite('2')])).toBeNull()
    expect(getInvitationDeclinedPath([])).toBe('/onboarding/create-organisation')
  })

  it('maps onboarding statuses to canonical routes', () => {
    const status = (step: OnboardingStatus['step']): OnboardingStatus => ({
      needsOnboarding: step !== 'done',
      step,
      pendingInvites: [],
      orgId: null,
      orgName: null,
      role: null,
    })

    expect(getOnboardingPathForStatus(status('invites'))).toBe('/onboarding/invitations')
    expect(getOnboardingPathForStatus(status('create'))).toBe('/onboarding/create-organisation')
    expect(getOnboardingPathForStatus(status('invite-members'))).toBe('/onboarding/invite-members')
    expect(getOnboardingPathForStatus(status('blocked'))).toBe('/onboarding/blocked')
    expect(getOnboardingPathForStatus(status('done'))).toBe('/account/home')
  })

  it('tracks each onboarding route as a distinct status scope', () => {
    expect(getOnboardingStatusScope('/onboarding/create-organisation')).toBe('/onboarding/create-organisation')
    expect(getOnboardingStatusScope('/onboarding/invite-members')).toBe('/onboarding/invite-members')
    expect(getOnboardingStatusScope('/account/home')).toBe('account')
  })
})
