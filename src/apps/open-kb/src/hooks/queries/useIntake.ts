import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createIntake, createIntakeIssue, fetchIntakeIssues, fetchIntakes, updateIntakeIssueStatus } from '../../api/intake'
import type { IntakeInput, IntakeIssueInput, IntakeIssueStatus } from '../../types'

export const intakeKeys = {
  intakes: (organisationId: string | null) => ['open-kb', 'intakes', organisationId] as const,
  issues: (organisationId: string | null) => ['open-kb', 'intake-issues', organisationId] as const,
}

export const useIntakes = (organisationId: string | null) =>
  useQuery({
    queryKey: intakeKeys.intakes(organisationId),
    queryFn: () => fetchIntakes(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useIntakeIssues = (organisationId: string | null) =>
  useQuery({
    queryKey: intakeKeys.issues(organisationId),
    queryFn: () => fetchIntakeIssues(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useCreateIntake = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IntakeInput) => createIntake(input),
    onSuccess: async (_intake, input) => {
      await queryClient.invalidateQueries({ queryKey: intakeKeys.intakes(input.organisation_id) })
    },
  })
}

export const useCreateIntakeIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IntakeIssueInput) => createIntakeIssue(input),
    onSuccess: async (_issue, input) => {
      await queryClient.invalidateQueries({ queryKey: intakeKeys.issues(input.organisation_id) })
    },
  })
}

export const useUpdateIntakeIssueStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { organisationId: string; intakeIssueId: string; status: IntakeIssueStatus }) =>
      updateIntakeIssueStatus(input),
    onSuccess: async (_issue, input) => {
      await queryClient.invalidateQueries({ queryKey: intakeKeys.issues(input.organisationId) })
    },
  })
}
