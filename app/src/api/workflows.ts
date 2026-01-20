import { supabase } from '../lib/supabase'
import { WorkflowRow } from '../components/dashboard/types'

type WorkflowMode = 'personal' | 'org'

type ListWorkflowsParams = {
  userId: string
  orgId: string | null | undefined
  mode: WorkflowMode
}

export const listWorkflows = async ({ userId, orgId, mode }: ListWorkflowsParams) => {
  let query = supabase
    .from('workflows')
    .select('id, name, created_at, owner_id, org_id')
    .order('created_at', { ascending: false })

  if (mode === 'org') {
    if (!orgId) return []
    query = query.eq('org_id', orgId)
  } else {
    query = query.eq('owner_id', userId).is('org_id', null)
  }

  const { data, error } = await query

  if (error) throw error
  return data as WorkflowRow[]
}

export const getWorkflow = async (id: string) => {
  const { data, error } = await supabase
    .from('workflows')
    .select('id, name, graph_data, owner_id, org_id')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

type SaveWorkflowParams = {
  id?: string | null
  name: string
  graph_data: any
  owner_id: string
  org_id: string | null
}

export const saveWorkflow = async (payload: SaveWorkflowParams) => {
  console.log('[api/workflows] saveWorkflow', { hasId: !!payload.id, owner_id: payload.owner_id, org_id: payload.org_id })
  if (payload.id) {
    const { data, error } = await supabase
      .from('workflows')
      .update({
        name: payload.name,
        graph_data: payload.graph_data,
      })
      .eq('id', payload.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      name: payload.name,
      graph_data: payload.graph_data,
      owner_id: payload.owner_id,
      org_id: payload.org_id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

type CloneWorkflowParams = {
  template: { id: string; name: string; description?: string | null; graph_data: any }
  ownerId: string
  orgId: string | null
}

export const cloneWorkflowFromTemplate = async ({ template, ownerId, orgId }: CloneWorkflowParams) => {
  const { data, error } = await supabase
    .from('workflows')
    .insert({
      name: `Copy of ${template.name}`,
      description: template.description,
      graph_data: template.graph_data,
      owner_id: ownerId,
      org_id: orgId,
      is_template: false,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export const updateWorkflowName = async ({ id, name }: { id: string; name: string }) => {
  const { error } = await supabase.from('workflows').update({ name }).eq('id', id)
  if (error) throw error
  return { id, name }
}

export const deleteWorkflow = async (workflowId: string) => {
  const { error } = await supabase.from('workflows').delete().eq('id', workflowId)
  if (error) throw error
}
