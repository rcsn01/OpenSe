import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkUpdateInventoryProducts,
  createFolderInInventory,
  createInventoryLocation,
  deleteFolderInInventory,
  fetchInventoryReferenceData,
  deleteInventoryProducts,
  fetchInventoryFilters,
  fetchInventoryProducts,
  fetchInventoryStats,
  importInventoryProducts,
  moveInventoryProducts,
  moveFolderInInventory,
  renameFolderInInventory,
  upsertProductBarcode,
  updateInventoryProductField,
  type FetchInventoryProductsParams,
  type ImportInventoryRow,
} from '../../api/inventory'

const inventoryKeys = {
  root: ['stoqr', 'inventory'] as const,
  filters: (companyId: string | null) => ['stoqr', 'inventory', 'filters', companyId] as const,
  stats: (companyId: string | null) => ['stoqr', 'inventory', 'stats', companyId] as const,
  reference: (companyId: string | null) => ['stoqr', 'inventory', 'reference', companyId] as const,
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

export const useInventoryReferenceData = (companyId: string | null) =>
  useQuery({
    queryKey: inventoryKeys.reference(companyId),
    queryFn: () => fetchInventoryReferenceData(companyId as string),
    enabled: !!companyId,
  })

export const useInventoryProducts = (
  params: Omit<FetchInventoryProductsParams, 'companyId'> & { companyId: string | null },
) =>
  useQuery({
    queryKey: inventoryKeys.products(params as FetchInventoryProductsParams & { companyId: string | null }),
    queryFn: () => fetchInventoryProducts({ ...(params as FetchInventoryProductsParams), companyId: params.companyId as string }),
    enabled: !!params.companyId,
    placeholderData: (previousData) => previousData,
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

export const useMoveInventoryProducts = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productIds: string[]; folderId: string | null }) => {
      if (!companyId) throw new Error('No company selected')
      return moveInventoryProducts(companyId, payload.productIds, payload.folderId)
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

export const useCreateInventoryLocation = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; code: string; description: string }) => {
      if (!companyId) throw new Error('No company selected')
      await createInventoryLocation(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useUpsertInventoryBarcode = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      productId: string
      barcode: string
      barcodeType: 'barcode' | 'qr'
      isPrimary: boolean
    }) => {
      if (!companyId) throw new Error('No company selected')
      await upsertProductBarcode(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useBulkUpdateInventoryProducts = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { productIds: string[]; quantityDelta?: number; priceMultiplier?: number }) => {
      if (!companyId) throw new Error('No company selected')
      return bulkUpdateInventoryProducts(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useRenameFolderInInventory = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { folderId: string; newName: string }) => {
      if (!companyId) throw new Error('No company selected')
      await renameFolderInInventory(companyId, payload.folderId, payload.newName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useDeleteFolderInInventory = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { folderId: string; action: 'move-uncategorised' | 'delete-products' }) => {
      if (!companyId) throw new Error('No company selected')
      await deleteFolderInInventory(companyId, payload.folderId, payload.action)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.root })
    },
  })
}

export const useMoveFolderInInventory = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { folderId: string; newParentId: string | null; sortOrder: number }) => {
      if (!companyId) throw new Error('No company selected')
      await moveFolderInInventory(companyId, payload.folderId, payload.newParentId, payload.sortOrder)
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
