import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  fetchProductDetail,
  fetchProductFolders,
  type CreateProductPayload,
} from '../../api/products'

const productKeys = {
  root: ['stoqr', 'products'] as const,
  folders: (companyId: string | null) => ['stoqr', 'products', 'folders', companyId] as const,
  detail: (companyId: string | null, productId: string | null) =>
    ['stoqr', 'products', 'detail', companyId, productId] as const,
}

export const useProductFolders = (companyId: string | null) =>
  useQuery({
    queryKey: productKeys.folders(companyId),
    queryFn: () => fetchProductFolders(companyId as string),
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
