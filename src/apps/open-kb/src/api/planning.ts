import { db } from '../supabaseClient'
import type {
  Cycle,
  CycleInput,
  CycleIssueLink,
  Estimate,
  EstimateInput,
  EstimatePoint,
  EstimateWithPoints,
  ModuleInput,
  ModuleIssueLink,
  ProjectModule,
} from '../types'

const cycleSelect = `
  id,
  organisation_id,
  project_id,
  name,
  description_text,
  starts_at,
  ends_at,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

const moduleSelect = `
  id,
  organisation_id,
  project_id,
  name,
  description_text,
  lead_profile_id,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

const estimateSelect = `
  id,
  organisation_id,
  project_id,
  name,
  description_text,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

const estimatePointSelect = `
  id,
  organisation_id,
  project_id,
  estimate_id,
  name,
  value,
  sort_order,
  created_at,
  updated_at,
  deleted_at,
  estimate:estimates(
    id,
    organisation_id,
    project_id,
    name,
    description_text,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at,
    project:projects(id, name, identifier)
  )
`

const cycleIssueSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  cycle_id,
  cycle:cycles(
    id,
    organisation_id,
    project_id,
    name,
    description_text,
    starts_at,
    ends_at,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at,
    project:projects(id, name, identifier)
  )
`

const moduleIssueSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  module_id,
  module:modules(
    id,
    organisation_id,
    project_id,
    name,
    description_text,
    lead_profile_id,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at,
    project:projects(id, name, identifier)
  )
`

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchCycles = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<Cycle[]> => {
  let query = db
    .from('cycles')
    .select(cycleSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('starts_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as Cycle[]
}

export const createCycle = async (input: CycleInput): Promise<Cycle> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id,
    name: input.name.trim(),
    description_text: input.description_text?.trim() || null,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    status: input.status,
  }

  const { data, error } = await db
    .from('cycles')
    .insert(payload)
    .select(cycleSelect)
    .single()

  if (error) throw error

  return data as unknown as Cycle
}

export const fetchModules = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<ProjectModule[]> => {
  let query = db
    .from('modules')
    .select(moduleSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as ProjectModule[]
}

export const createModule = async (input: ModuleInput): Promise<ProjectModule> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id,
    name: input.name.trim(),
    description_text: input.description_text?.trim() || null,
    status: input.status,
  }

  const { data, error } = await db
    .from('modules')
    .insert(payload)
    .select(moduleSelect)
    .single()

  if (error) throw error

  return data as unknown as ProjectModule
}

export const fetchEstimatePoints = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<EstimatePoint[]> => {
  let query = db
    .from('estimate_points')
    .select(estimatePointSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('value', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as EstimatePoint & { estimate: Estimate | Estimate[] | null }
    return {
      ...item,
      value: Number(item.value),
      estimate: normalizeSingle(item.estimate),
    }
  })
}

export const fetchEstimates = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<EstimateWithPoints[]> => {
  let query = db
    .from('estimates')
    .select(estimateSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  const estimates = (data ?? []) as unknown as Estimate[]
  if (estimates.length === 0) return []

  const points = await fetchEstimatePoints({ organisationId, projectId })
  return estimates.map((estimate) => ({
    ...estimate,
    points: points.filter((point) => point.estimate_id === estimate.id),
  }))
}

export const createEstimate = async (input: EstimateInput): Promise<EstimateWithPoints> => {
  const { data, error } = await db
    .from('estimates')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      name: input.name.trim(),
      description_text: input.description_text?.trim() || null,
    })
    .select(estimateSelect)
    .single()

  if (error) throw error

  const estimate = data as unknown as Estimate
  const pointPayload = input.points
    .filter((point) => point.name.trim())
    .map((point, index) => ({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      estimate_id: estimate.id,
      name: point.name.trim(),
      value: point.value,
      sort_order: (index + 1) * 10,
    }))

  if (pointPayload.length > 0) {
    const { error: pointsError } = await db
      .from('estimate_points')
      .insert(pointPayload)

    if (pointsError) throw pointsError
  }

  const points = await fetchEstimatePoints({ organisationId: input.organisation_id, projectId: input.project_id })
  return {
    ...estimate,
    points: points.filter((point) => point.estimate_id === estimate.id),
  }
}

export const fetchIssueCycleLinks = async (
  organisationId: string,
  issueId: string,
): Promise<CycleIssueLink[]> => {
  const { data, error } = await db
    .from('cycle_issues')
    .select(cycleIssueSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as CycleIssueLink & { cycle: Cycle | Cycle[] | null }
    return {
      ...item,
      cycle: normalizeSingle(item.cycle),
    }
  })
}

export const fetchCycleIssueLinks = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<CycleIssueLink[]> => {
  let query = db
    .from('cycle_issues')
    .select(cycleIssueSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as CycleIssueLink & { cycle: Cycle | Cycle[] | null }
    return {
      ...item,
      cycle: normalizeSingle(item.cycle),
    }
  })
}

export const addIssueCycleLink = async ({
  organisationId,
  projectId,
  issueId,
  cycleId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  cycleId: string
}): Promise<CycleIssueLink> => {
  const { data, error } = await db
    .from('cycle_issues')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      cycle_id: cycleId,
    })
    .select(cycleIssueSelect)
    .single()

  if (error) throw error

  const item = data as unknown as CycleIssueLink & { cycle: Cycle | Cycle[] | null }
  return {
    ...item,
    cycle: normalizeSingle(item.cycle),
  }
}

export const removeIssueCycleLink = async ({
  organisationId,
  linkId,
}: {
  organisationId: string
  linkId: string
}) => {
  const { error } = await db
    .from('cycle_issues')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', linkId)

  if (error) throw error
}

export const fetchIssueModuleLinks = async (
  organisationId: string,
  issueId: string,
): Promise<ModuleIssueLink[]> => {
  const { data, error } = await db
    .from('module_issues')
    .select(moduleIssueSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as ModuleIssueLink & { module: ProjectModule | ProjectModule[] | null }
    return {
      ...item,
      module: normalizeSingle(item.module),
    }
  })
}

export const fetchModuleIssueLinks = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<ModuleIssueLink[]> => {
  let query = db
    .from('module_issues')
    .select(moduleIssueSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as ModuleIssueLink & { module: ProjectModule | ProjectModule[] | null }
    return {
      ...item,
      module: normalizeSingle(item.module),
    }
  })
}

export const addIssueModuleLink = async ({
  organisationId,
  projectId,
  issueId,
  moduleId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  moduleId: string
}): Promise<ModuleIssueLink> => {
  const { data, error } = await db
    .from('module_issues')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      module_id: moduleId,
    })
    .select(moduleIssueSelect)
    .single()

  if (error) throw error

  const item = data as unknown as ModuleIssueLink & { module: ProjectModule | ProjectModule[] | null }
  return {
    ...item,
    module: normalizeSingle(item.module),
  }
}

export const removeIssueModuleLink = async ({
  organisationId,
  linkId,
}: {
  organisationId: string
  linkId: string
}) => {
  const { error } = await db
    .from('module_issues')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', linkId)

  if (error) throw error
}
