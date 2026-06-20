import { db } from '../supabaseClient'
import type { Intake, IntakeInput, IntakeIssue, IntakeIssueInput, IntakeIssueStatus } from '../types'

const intakeSelect = `
  id,
  organisation_id,
  project_id,
  name,
  title,
  description_text,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

const intakeIssueSelect = `
  id,
  organisation_id,
  project_id,
  intake_id,
  issue_id,
  name,
  title,
  description_text,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  intake:intakes(id, organisation_id, project_id, name, title, description_text, status, created_by, created_at, updated_at, deleted_at)
`

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchIntakes = async (organisationId: string): Promise<Intake[]> => {
  const { data, error } = await db
    .from('intakes')
    .select(intakeSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as unknown as Intake[]
}

export const createIntake = async (input: IntakeInput): Promise<Intake> => {
  const { data, error } = await db
    .from('intakes')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      name: input.title.trim(),
      title: input.title.trim(),
      description_text: input.description_text?.trim() || null,
      status: input.status,
    })
    .select(intakeSelect)
    .single()

  if (error) throw error

  return data as unknown as Intake
}

export const fetchIntakeIssues = async (organisationId: string): Promise<IntakeIssue[]> => {
  const { data, error } = await db
    .from('intake_issues')
    .select(intakeIssueSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as IntakeIssue & { intake: Intake | Intake[] | null }
    return {
      ...item,
      intake: normalizeSingle(item.intake),
    }
  })
}

export const createIntakeIssue = async (input: IntakeIssueInput): Promise<IntakeIssue> => {
  const { data, error } = await db
    .from('intake_issues')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      intake_id: input.intake_id,
      name: input.title.trim(),
      title: input.title.trim(),
      description_text: input.description_text?.trim() || null,
      status: 'submitted',
    })
    .select(intakeIssueSelect)
    .single()

  if (error) throw error

  const item = data as unknown as IntakeIssue & { intake: Intake | Intake[] | null }
  return {
    ...item,
    intake: normalizeSingle(item.intake),
  }
}

export const updateIntakeIssueStatus = async ({
  organisationId,
  intakeIssueId,
  status,
}: {
  organisationId: string
  intakeIssueId: string
  status: IntakeIssueStatus
}): Promise<IntakeIssue> => {
  const { data, error } = await db
    .from('intake_issues')
    .update({ status })
    .eq('organisation_id', organisationId)
    .eq('id', intakeIssueId)
    .select(intakeIssueSelect)
    .single()

  if (error) throw error

  const item = data as unknown as IntakeIssue & { intake: Intake | Intake[] | null }
  return {
    ...item,
    intake: normalizeSingle(item.intake),
  }
}
