import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAttributeFolder,
  createAttributeTag,
  deleteAttributeTag,
  fetchAttributeFolders,
  fetchAttributeTags,
  updateAttributeFolder,
  updateAttributeTag,
} from '../../api/attributes'
import type { Folder, Tag } from '../../types'

const attributesKeys = {
  root: ['stoqr', 'attributes'] as const,
  folders: (companyId: string | null) => ['stoqr', 'attributes', 'folders', companyId] as const,
  tags: (companyId: string | null) => ['stoqr', 'attributes', 'tags', companyId] as const,
}

export const useAttributeFolders = (companyId: string | null) =>
  useQuery({
    queryKey: attributesKeys.folders(companyId),
    queryFn: () => fetchAttributeFolders(companyId as string),
    enabled: !!companyId,
  })

export const useAttributeTags = (companyId: string | null) =>
  useQuery({
    queryKey: attributesKeys.tags(companyId),
    queryFn: () => fetchAttributeTags(companyId as string),
    enabled: !!companyId,
  })

export const useCreateAttributeFolder = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; parent_id: string | null }) => {
      if (!companyId) throw new Error('No company selected')
      return createAttributeFolder(companyId, payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attributesKeys.root }),
  })
}

export const useUpdateAttributeFolder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ folderId, updates }: { folderId: string; updates: Partial<Folder> }) =>
      updateAttributeFolder(folderId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attributesKeys.root }),
  })
}

export const useCreateAttributeTag = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; color: string }) => {
      if (!companyId) throw new Error('No company selected')
      return createAttributeTag(companyId, payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attributesKeys.root }),
  })
}

export const useUpdateAttributeTag = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tagId, updates }: { tagId: string; updates: Partial<Tag> }) =>
      updateAttributeTag(tagId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attributesKeys.root }),
  })
}

export const useDeleteAttributeTag = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tagId: string) => deleteAttributeTag(tagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attributesKeys.root }),
  })
}
