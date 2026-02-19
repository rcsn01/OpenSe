import { db } from '../supabaseClient'
import type { Folder, Tag } from '../types'

export const fetchAttributeFolders = async (companyId: string): Promise<Folder[]> => {
  const { data, error } = await db
    .from('folders')
    .select('id, name, parent_id')
    .eq('company_id', companyId)

  if (error) throw error

  return (data as Folder[] | null) ?? []
}

export const fetchAttributeTags = async (companyId: string): Promise<Tag[]> => {
  const { data, error } = await db
    .from('tags')
    .select('id, name, color')
    .eq('company_id', companyId)

  if (error) throw error

  return (data as Tag[] | null) ?? []
}

export const createAttributeFolder = async (companyId: string, payload: { name: string; parent_id: string | null }) => {
  const { error } = await db.from('folders').insert({
    company_id: companyId,
    name: payload.name,
    parent_id: payload.parent_id,
  })

  if (error) throw error
}

export const updateAttributeFolder = async (folderId: string, updates: Partial<Folder>) => {
  const { error } = await db.from('folders').update(updates).eq('id', folderId)
  if (error) throw error
}

export const createAttributeTag = async (companyId: string, payload: { name: string; color: string }) => {
  const { error } = await db.from('tags').insert({
    company_id: companyId,
    name: payload.name,
    color: payload.color,
  })

  if (error) throw error
}

export const updateAttributeTag = async (tagId: string, updates: Partial<Tag>) => {
  const { error } = await db.from('tags').update(updates).eq('id', tagId)
  if (error) throw error
}

export const deleteAttributeTag = async (tagId: string) => {
  const { error } = await db.from('tags').delete().eq('id', tagId)
  if (error) throw error
}
