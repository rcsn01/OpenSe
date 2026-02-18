import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProductAttachments,
  fetchProductBatchHistory,
  fetchProductSuppliers,
  uploadProductAttachment,
} from '../../api/productDetail'

const productDetailKeys = {
  root: ['stoqr', 'product-detail'] as const,
  suppliers: (companyId: string, productId: string) => ['stoqr', 'product-detail', 'suppliers', companyId, productId] as const,
  batchHistory: (companyId: string, productId: string) => ['stoqr', 'product-detail', 'batch-history', companyId, productId] as const,
  attachments: (companyId: string, productId: string) => ['stoqr', 'product-detail', 'attachments', companyId, productId] as const,
}

export const useProductSuppliers = (companyId: string, productId: string) =>
  useQuery({
    queryKey: productDetailKeys.suppliers(companyId, productId),
    queryFn: () => fetchProductSuppliers(companyId, productId),
    enabled: !!companyId && !!productId,
  })

export const useProductBatchHistory = (companyId: string, productId: string) =>
  useQuery({
    queryKey: productDetailKeys.batchHistory(companyId, productId),
    queryFn: () => fetchProductBatchHistory(companyId, productId),
    enabled: !!companyId && !!productId,
  })

export const useProductAttachments = (companyId: string, productId: string) =>
  useQuery({
    queryKey: productDetailKeys.attachments(companyId, productId),
    queryFn: () => fetchProductAttachments(companyId, productId),
    enabled: !!companyId && !!productId,
  })

export const useUploadProductAttachment = (companyId: string, productId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadProductAttachment(companyId, productId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productDetailKeys.root })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'products'] })
    },
  })
}
