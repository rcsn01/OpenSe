import { db } from '../lib/supabase'

export type WorkflowVersion = {
  id: string
  workflow_id: string
  version_number: number
  graph_data: any
  name: string | null
  created_by: string | null
  created_at: string
  change_summary: string | null
}

/**
 * Fetches all versions for a workflow, ordered by most recent first.
 */
export const listWorkflowVersions = async (workflowId: string): Promise<WorkflowVersion[]> => {
  const { data, error } = await db
    .from('workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data as WorkflowVersion[]
}

/**
 * Fetches a specific version by ID.
 */
export const getWorkflowVersion = async (versionId: string): Promise<WorkflowVersion> => {
  const { data, error } = await db
    .from('workflow_versions')
    .select('*')
    .eq('id', versionId)
    .single()

  if (error) throw error
  return data as WorkflowVersion
}

/**
 * Creates a new version snapshot for a workflow.
 * Auto-increments version_number based on the latest existing version.
 */
export const createWorkflowVersion = async (params: {
  workflowId: string
  graphData: any
  name: string
  userId: string
  changeSummary?: string
}): Promise<WorkflowVersion> => {
  // Get current max version number
  const { data: existing } = await db
    .from('workflow_versions')
    .select('version_number')
    .eq('workflow_id', params.workflowId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (existing?.[0]?.version_number ?? 0) + 1

  const { data, error } = await db
    .from('workflow_versions')
    .insert({
      workflow_id: params.workflowId,
      version_number: nextVersion,
      graph_data: params.graphData,
      name: params.name,
      created_by: params.userId,
      change_summary: params.changeSummary || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as WorkflowVersion
}
