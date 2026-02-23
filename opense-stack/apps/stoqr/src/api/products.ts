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
  performed_by: string | null
}

type ProfileLookup = {
  id: string
  full_name: string | null
  username: string | null
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

export const fetchProductDetail = async (
  companyId: string,
  productId: string,
): Promise<{ product: Product | null; transactions: InventoryTransaction[] }> => {
  const { data: productData, error: productError } = await db
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', productId)
    .single()

  if (productError) {
    if ((productError as { code?: string }).code === 'PGRST116') {
      return { product: null, transactions: [] }
    }
    throw productError
  }

  const { data: transactionsData, error: transactionsError } = await db
    .from('inventory_transactions')
    .select('id, transaction_type, quantity_change, stock_after, created_at, notes, performed_by')
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (transactionsError) {
    console.warn('Product detail transactions query failed', transactionsError)
    return {
      product: (productData as Product | null) ?? null,
      transactions: [],
    }
  }

  const transactionRows = ((transactionsData as ProductTransactionRow[] | null) ?? [])
  const profileIds = Array.from(
    new Set(transactionRows.map((transaction) => transaction.performed_by).filter((value): value is string => !!value)),
  )

  const { data: profileRows, error: profilesError } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', profileIds)
    : { data: [] as ProfileLookup[], error: null }

  if (profilesError) {
    console.warn('Product detail profile enrichment failed', profilesError)
  }

  const profilesById = new Map(
    ((profileRows ?? []) as ProfileLookup[]).map((profile) => [profile.id, profile]),
  )

  const normalizedTransactions = transactionRows.map((transaction) => ({
    id: transaction.id,
    transaction_type: transaction.transaction_type,
    quantity_change: transaction.quantity_change,
    stock_after: transaction.stock_after,
    notes: transaction.notes,
    created_at: transaction.created_at,
    profiles: transaction.performed_by ? profilesById.get(transaction.performed_by) ?? undefined : undefined,
  })) as InventoryTransaction[]

  return {
    product: (productData as Product | null) ?? null,
    transactions: normalizedTransactions,
  }
}
