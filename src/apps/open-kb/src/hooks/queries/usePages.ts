import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPage, fetchPage, fetchPages, fetchPageVersions, updatePage } from '../../api/pages'
import type { PageInput, PageUpdateInput } from '../../types'

export const pageKeys = {
  all: (organisationId: string | null) => ['open-kb', 'pages', organisationId] as const,
  list: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'pages', organisationId, 'list', projectId ?? 'all'] as const,
  detail: (organisationId: string | null, pageId: string | null) =>
    ['open-kb', 'pages', organisationId, 'detail', pageId] as const,
  versions: (organisationId: string | null, pageId: string | null) =>
    ['open-kb', 'pages', organisationId, 'versions', pageId] as const,
}

export const usePages = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: pageKeys.list(organisationId, projectId),
    queryFn: () => fetchPages({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(enabled && organisationId),
  })

export const usePage = (organisationId: string | null, pageId: string | null) =>
  useQuery({
    queryKey: pageKeys.detail(organisationId, pageId),
    queryFn: () => fetchPage(organisationId ?? '', pageId ?? ''),
    enabled: Boolean(organisationId && pageId),
  })

export const usePageVersions = (organisationId: string | null, pageId: string | null) =>
  useQuery({
    queryKey: pageKeys.versions(organisationId, pageId),
    queryFn: () => fetchPageVersions(organisationId ?? '', pageId ?? ''),
    enabled: Boolean(organisationId && pageId),
  })

export const useCreatePage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PageInput) => createPage(input),
    onSuccess: async (page, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pageKeys.all(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'project-summary', input.organisation_id] }),
        queryClient.setQueryData(pageKeys.detail(input.organisation_id, page.id), page),
      ])
    },
  })
}

export const useUpdatePage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PageUpdateInput) => updatePage(input),
    onSuccess: async (page, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pageKeys.all(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: pageKeys.versions(input.organisation_id, page.id) }),
        queryClient.setQueryData(pageKeys.detail(input.organisation_id, page.id), page),
      ])
    },
  })
}
