import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFolderInInventory,
  createInventoryQuickProduct,
  fetchFolderProducts,
  deleteInventoryProducts,
  fetchInventoryFilters,
  fetchInventoryProducts,
  fetchInventoryStats,
  importInventoryProducts,
  type QuickCreateProductPayload,
  updateInventoryProductField,
  type FetchInventoryProductsParams,
  type ImportInventoryRow,
} from '../../api/inventory'

const inventoryKeys = {
  root: ['stoqr', 'inventory'] as const,
  filters: (companyId: string | null) => ['stoqr', 'inventory', 'filters', companyId] as const,
  stats: (companyId: string | null) => ['stoqr', 'inventory', 'stats', companyId] as const,
  folderProducts: (companyId: string | null, folderId: string | null) =>
    ['stoqr', 'inventory', 'folder-products', companyId, folderId] as const,
  products: (params: FetchInventoryProductsParams & { companyId: string | null }) =>
    ['stoqr', 'inventory', 'products', params] as const,
}

export const useInventoryFilters = (companyId: string | null) =>
  useQuery({
    queryKey: inventoryKeys.filters(companyId),
    queryFn: () => fetchInventoryFilters(companyId as string),
    enabled: !!companyId,
  })

export const useInventoryStats = (companyId: string | null) =>
  useQuery({
    queryKey: inventoryKeys.stats(companyId),
    queryFn: () => fetchInventoryStats(companyId as string),
    enabled: !!companyId,
  })

export const useFolderProducts = (companyId: string | null, folderId: string | null) =>
  useQuery({
    queryKey: inventoryKeys.folderProducts(companyId, folderId),
    queryFn: () => fetchFolderProducts(companyId as string, folderId),
    enabled: !!companyId,
  })

export const useInventoryProducts = (
  params: Omit<FetchInventoryProductsParams, 'companyId'> & { companyId: string | null },
) =>
  useQuery({
    queryKey: inventoryKeys.products(params as FetchInventoryProductsParams & { companyId: string | null }),
    queryFn: () => fetchInventoryProducts({ ...(params as FetchInventoryProductsParams), companyId: params.companyId as string }),
    enabled: !!params.companyId,
  })

export const useDeleteInventoryProducts = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productIds: string[]) => {
      if (!companyId) throw new Error('No company selected')
      await deleteInventoryProducts(companyId, productIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useImportInventoryProducts = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: ImportInventoryRow[]) => {
      if (!companyId) throw new Error('No company selected')
      return importInventoryProducts(companyId, rows)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useCreateInventoryFolder = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; parentId: string | null }) => {
      if (!companyId) throw new Error('No company selected')
      await createFolderInInventory(companyId, payload.name, payload.parentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useCreateInventoryQuickProduct = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: QuickCreateProductPayload) => {
      if (!companyId) throw new Error('No company selected')
      await createInventoryQuickProduct(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useUpdateInventoryProductField = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productId: string; field: 'quantity_on_hand' | 'selling_price'; value: number }) => {
      if (!companyId) throw new Error('No company selected')
      await updateInventoryProductField(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useInventoryRefresh = () => {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
  }
}
