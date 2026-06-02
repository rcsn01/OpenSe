import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  fetchProductAttributeCatalog,
  fetchProductDetail,
  fetchProductFolders,
  transferProductStock,
  type CreateProductPayload,
  type TransferProductStockParams,
  updateProduct,
  type UpdateProductPayload,
} from '../../api/products'

const productKeys = {
  root: ['stoqr', 'products'] as const,
  folders: (companyId: string | null) => ['stoqr', 'products', 'folders', companyId] as const,
  attributeCatalog: (companyId: string | null) => ['stoqr', 'products', 'attribute-catalog', companyId] as const,
  detail: (companyId: string | null, productId: string | null) =>
    ['stoqr', 'products', 'detail', companyId, productId] as const,
}

export const useProductFolders = (companyId: string | null) =>
  useQuery({
    queryKey: productKeys.folders(companyId),
    queryFn: () => fetchProductFolders(companyId as string),
    enabled: !!companyId,
  })

export const useProductAttributeCatalog = (companyId: string | null) =>
  useQuery({
    queryKey: productKeys.attributeCatalog(companyId),
    queryFn: () => fetchProductAttributeCatalog(companyId as string),
    enabled: !!companyId,
  })

export const useProductDetail = (companyId: string | null, productId: string | null) =>
  useQuery({
    queryKey: productKeys.detail(companyId, productId),
    queryFn: () => fetchProductDetail(companyId as string, productId as string),
    enabled: !!companyId && !!productId,
  })

export const useCreateProduct = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { payload: CreateProductPayload; images: File[] }) => {
      if (!companyId) throw new Error('No company selected')
      return createProduct(companyId, params.payload, params.images)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.root })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'procurement'] })
    },
  })
}

export const useUpdateProduct = (companyId: string | null, productId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      payload: UpdateProductPayload
      images: File[]
      retainedImageUrls: string[]
    }) => {
      if (!companyId) throw new Error('No company selected')
      if (!productId) throw new Error('No product selected')
      return updateProduct(companyId, productId, params.payload, params.images, params.retainedImageUrls)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.root })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'procurement'] })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(companyId, productId) })
      if (variables.payload.folderId) {
        queryClient.invalidateQueries({ queryKey: productKeys.folders(companyId) })
      }
    },
  })
}

export const useTransferProductStock = (companyId: string | null, productId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<TransferProductStockParams, 'companyId' | 'productId'>) => {
      if (!companyId) throw new Error('No company selected')
      if (!productId) throw new Error('No product selected')
      return transferProductStock({
        companyId,
        productId,
        ...payload,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(companyId, productId) })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'alerts'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'reports'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'procurement'] })
    },
  })
}
