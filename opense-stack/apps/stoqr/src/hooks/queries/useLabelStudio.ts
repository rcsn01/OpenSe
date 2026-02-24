import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLabelPrintJob,
  createLabelTemplate,
  fetchLabelPrintJobs,
  fetchLabelProducts,
  fetchLabelTemplates,
  updateLabelTemplateLayout,
} from '../../api/labelStudio'

const labelStudioKeys = {
  products: (companyId: string | null, search: string) =>
    ['stoqr', 'label-studio', 'products', companyId, search] as const,
  templates: (companyId: string | null) => ['stoqr', 'label-studio', 'templates', companyId] as const,
  printJobs: (companyId: string | null) => ['stoqr', 'label-studio', 'print-jobs', companyId] as const,
}

export const useLabelProducts = (companyId: string | null, search: string) =>
  useQuery({
    queryKey: labelStudioKeys.products(companyId, search),
    queryFn: () => fetchLabelProducts(companyId as string, search),
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
      templateType: 'product' | 'shelf' | 'bin' | 'shipping'
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
      await updateLabelTemplateLayout({
        companyId,
        ...payload,
      })
    },
    onSuccess: () => {
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
    }) => {
      if (!companyId) throw new Error('No company selected')
      await createLabelPrintJob({ companyId, ...payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelStudioKeys.printJobs(companyId) })
    },
  })
}
