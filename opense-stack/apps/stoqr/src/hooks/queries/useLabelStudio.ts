import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLabelPrintJob,
  createLabelTemplate,
  fetchLabelProductFolders,
  fetchLabelPrintJobs,
  fetchLabelProducts,
  fetchLabelTemplates,
  type LabelTemplate,
  updateLabelTemplateLayout,
} from '../../api/labelStudio'

const labelStudioKeys = {
  products: (companyId: string | null, search: string) =>
    ['stoqr', 'label-studio', 'products', companyId, search] as const,
  productFolders: (companyId: string | null) => ['stoqr', 'label-studio', 'product-folders', companyId] as const,
  templates: (companyId: string | null) => ['stoqr', 'label-studio', 'templates', companyId] as const,
  printJobs: (companyId: string | null) => ['stoqr', 'label-studio', 'print-jobs', companyId] as const,
}

export const useLabelProducts = (companyId: string | null, search: string, folderId?: string) =>
  useQuery({
    queryKey: [...labelStudioKeys.products(companyId, search), folderId ?? 'all'] as const,
    queryFn: () => fetchLabelProducts(companyId as string, search, folderId),
    enabled: !!companyId,
  })

export const useLabelProductFolders = (companyId: string | null) =>
  useQuery({
    queryKey: labelStudioKeys.productFolders(companyId),
    queryFn: () => fetchLabelProductFolders(companyId as string),
    enabled: !!companyId,
  })

export const useLabelTemplates = (companyId: string | null) =>
  useQuery({
    queryKey: labelStudioKeys.templates(companyId),
    queryFn: () => fetchLabelTemplates(companyId as string),
    enabled: !!companyId,
  })

export const useLabelPrintJobs = (companyId: string | null) =>
  useQuery({
    queryKey: labelStudioKeys.printJobs(companyId),
    queryFn: () => fetchLabelPrintJobs(companyId as string),
    enabled: !!companyId,
  })

export const useCreateLabelTemplate = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      name: string
      layout: Record<string, unknown>
      variableFields: string[]
    }) => {
      if (!companyId) throw new Error('No company selected')
      await createLabelTemplate({
        companyId,
        ...payload,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelStudioKeys.templates(companyId) })
    },
  })
}

export const useUpdateLabelTemplateLayout = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      templateId: string
      layout: Record<string, unknown>
      variableFields: string[]
    }) => {
      if (!companyId) throw new Error('No company selected')
      return updateLabelTemplateLayout({
        companyId,
        ...payload,
      })
    },
    onSuccess: (savedTemplate) => {
      queryClient.setQueryData(labelStudioKeys.templates(companyId), (currentTemplates: LabelTemplate[] | undefined) => {
        if (!savedTemplate) return currentTemplates

        const nextTemplates = (currentTemplates ?? []).filter((template) => {
          if (template.id === savedTemplate.id) {
            return false
          }

          const matchesTemplateName = template.name.trim().toLowerCase() === savedTemplate.name.trim().toLowerCase()
          if (!matchesTemplateName) {
            return true
          }

          if (savedTemplate.company_id === companyId && (template.company_id === null || template.company_id === companyId)) {
            return false
          }

          return true
        })

        return [...nextTemplates, savedTemplate].sort((left, right) => left.name.localeCompare(right.name))
      })
      queryClient.invalidateQueries({ queryKey: labelStudioKeys.templates(companyId) })
    },
  })
}

export const useCreateLabelPrintJob = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      templateId: string | null
      format: 'pdf' | 'png'
      quantity: number
      payload: Record<string, unknown>
      outputUrl?: string | null
      status?: 'queued' | 'processing' | 'completed' | 'failed'
    }) => {
      if (!companyId) throw new Error('No company selected')
      await createLabelPrintJob({ companyId, ...payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelStudioKeys.printJobs(companyId) })
    },
  })
}
