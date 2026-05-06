import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTopBarSearch, useTopBarSearchValue } from '../components/Search/TopBarSearch'
import type { SearchSuggestion } from '../lib/pageSearch'
import { defaultInventoryUrlState } from '../pages/inventoryUrlState'
import { useInventoryProducts } from './queries/useInventory'
import { useDebouncedValue } from './useDebouncedValue'

type ProductSearchItem = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
}

const productSearchSuggestionPrefix = 'product-search-'

export const buildProductSearchSuggestions = (products: ProductSearchItem[]) => (
  products.slice(0, 8).map((product) => ({
    id: `${productSearchSuggestionPrefix}${product.id}`,
    title: product.name,
    subtitle: `${product.sku || 'No SKU'} · ${product.quantity_on_hand} on hand`,
    value: product.name,
    keywords: [product.name, product.sku].filter(Boolean),
    badge: 'Product',
  }))
)

export const getProductSearchDestination = (suggestion: Pick<SearchSuggestion, 'id'>) => {
  const productId = suggestion.id.replace(new RegExp(`^${productSearchSuggestionPrefix}`), '')
  return `/inventory/${productId}/overview`
}

export const useProductPageSearch = (companyId: string | null) => {
  const navigate = useNavigate()
  const { searchValue } = useTopBarSearchValue()
  const debouncedSearchValue = useDebouncedValue(searchValue, 250)
  const productSuggestionsQuery = useInventoryProducts({
    companyId,
    search: debouncedSearchValue,
    stockFilter: defaultInventoryUrlState.stockFilter,
    page: defaultInventoryUrlState.page,
    pageSize: 8,
    sortField: defaultInventoryUrlState.sortField,
    sortDir: defaultInventoryUrlState.sortDir,
  })

  const searchSuggestions = useMemo(
    () => buildProductSearchSuggestions(productSuggestionsQuery.data?.products ?? []),
    [productSuggestionsQuery.data?.products],
  )

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    navigate(getProductSearchDestination(suggestion))
  }, [navigate])

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'inventory-product-pages',
    placeholder: 'Search items...',
    suggestions: searchSuggestions,
    onSuggestionSelect: handleSuggestionSelect,
  }), [handleSuggestionSelect, searchSuggestions]))
}
