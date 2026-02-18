import { db, supabase } from '../supabaseClient'
import { toNumber } from '../utils'
import type { Folder, InventoryTransaction, Product } from '../types'

type ProductTransactionRow = {
  id: string
  transaction_type: string
  quantity_change: number
  stock_after: number | null
  created_at: string
  notes: string | null
  profiles: { id: string; full_name: string | null; username: string | null } | { id: string; full_name: string | null; username: string | null }[] | null
}

export type CreateProductPayload = {
  name: string
  sku: string
  description: string
  category: string
  quantity: string
  reorderPoint: string
  costPrice: string
  sellingPrice: string
  folderId: string
  expiryDate: string
  customFields: Record<string, unknown>
}

export const fetchProductFolders = async (companyId: string): Promise<Folder[]> => {
  const { data, error } = await db
    .from('folders')
    .select('id, name, parent_id')
    .eq('company_id', companyId)
    .order('name')

  if (error) throw error

  return (data as Folder[] | null) ?? []
}

export const createProduct = async (
  companyId: string,
  payload: CreateProductPayload,
  images: File[],
): Promise<{ id: string }> => {
  const { data: insertedProduct, error: insertError } = await db
    .from('products')
    .insert({
      company_id: companyId,
      name: payload.name,
      sku: payload.sku,
      description: payload.description || null,
      category: payload.category || null,
      quantity_on_hand: toNumber(payload.quantity),
      reorder_point: toNumber(payload.reorderPoint),
      cost_price: toNumber(payload.costPrice),
      selling_price: toNumber(payload.sellingPrice),
      folder_id: payload.folderId === '' ? null : payload.folderId,
      expiry_date: payload.expiryDate || null,
      custom_fields: payload.customFields,
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  if (!insertedProduct?.id) throw new Error('Product creation failed')

  const uploadedImagePaths: string[] = []

  if (images.length > 0) {
    const uploadResults = await Promise.allSettled(
      images.map(async (file) => {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `${companyId}/${insertedProduct.id}/${Date.now()}_${cleanName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file)

        if (uploadError) throw uploadError
        return path
      }),
    )

    uploadResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        uploadedImagePaths.push(result.value)
      }
    })

    if (uploadedImagePaths.length > 0) {
      const { error: updateError } = await db
        .from('products')
        .update({ image_urls: uploadedImagePaths })
        .eq('id', insertedProduct.id)

      if (updateError) throw updateError
    }
  }

  return { id: insertedProduct.id }
}

const normalizeTransactionProfile = (
  profiles: ProductTransactionRow['profiles'],
): InventoryTransaction['profiles'] => {
  if (!profiles) return undefined
  return Array.isArray(profiles) ? profiles[0] : profiles
}

export const fetchProductDetail = async (
  companyId: string,
  productId: string,
): Promise<{ product: Product | null; transactions: InventoryTransaction[] }> => {
  const [{ data: productData, error: productError }, { data: transactionsData, error: transactionsError }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', productId)
      .single(),
    supabase
      .from('inventory_transactions')
      .select('id, transaction_type, quantity_change, stock_after, created_at, notes, profiles (id, full_name, username)')
      .eq('company_id', companyId)
      .eq('product_id', productId)
      .order('created_at', { ascending: false }),
  ])

  if (productError) {
    if ((productError as { code?: string }).code === 'PGRST116') {
      return { product: null, transactions: [] }
    }
    throw productError
  }

  if (transactionsError) throw transactionsError

  const normalizedTransactions = ((transactionsData as ProductTransactionRow[] | null) ?? []).map((transaction) => ({
    ...transaction,
    profiles: normalizeTransactionProfile(transaction.profiles),
  })) as InventoryTransaction[]

  return {
    product: (productData as Product | null) ?? null,
    transactions: normalizedTransactions,
  }
}
