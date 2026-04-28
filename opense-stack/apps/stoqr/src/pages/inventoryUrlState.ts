import type {
  CustomFieldActiveFilter,
  CustomFieldFilterOption,
  CustomFieldPrimitive,
  CustomFieldValueType,
} from '../types'
import type { SortDirection, SortField } from '../components/Inventory/types'

export type InventoryStockFilter = 'all' | 'low' | 'out'

export type InventoryUrlState = {
  stockFilter: InventoryStockFilter
  page: number
  pageSize: number
  sortField: SortField
  sortDir: SortDirection
  activeCustomFieldFilters: CustomFieldActiveFilter[]
}

const inventoryStockFilters: InventoryStockFilter[] = ['all', 'low', 'out']
const inventorySortFields: SortField[] = ['name', 'sku', 'quantity_on_hand', 'selling_price', 'folder_id', 'reorder_point']
const inventorySortDirections: SortDirection[] = ['asc', 'desc']

export const defaultInventoryUrlState = {
  stockFilter: 'all' as InventoryStockFilter,
  page: 1,
  pageSize: 10,
  sortField: 'name' as SortField,
  sortDir: 'asc' as SortDirection,
}

const customFieldParamPrefix = 'cf.'
const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0

const parsePositiveInteger = (value: string | null, fallback: number) => {
  if (value === null) return fallback

  const parsed = Number.parseInt(value, 10)
  return isPositiveInteger(parsed) ? parsed : fallback
}

const parseInventoryStockFilter = (value: string | null): InventoryStockFilter => (
  value !== null && inventoryStockFilters.includes(value as InventoryStockFilter)
    ? value as InventoryStockFilter
    : defaultInventoryUrlState.stockFilter
)

const parseInventoryPageSize = (value: string | null): number => {
  const parsed = parsePositiveInteger(value, defaultInventoryUrlState.pageSize)
  return inventoryPageSizeOptions.includes(parsed) ? parsed : defaultInventoryUrlState.pageSize
}

const parseInventorySortField = (value: string | null): SortField => (
  value !== null && inventorySortFields.includes(value as SortField)
    ? value as SortField
    : defaultInventoryUrlState.sortField
)

const parseInventorySortDirection = (value: string | null): SortDirection => (
  value !== null && inventorySortDirections.includes(value as SortDirection)
    ? value as SortDirection
    : defaultInventoryUrlState.sortDir
)

const parseCustomFieldValue = (value: string, valueType: CustomFieldValueType): CustomFieldPrimitive | null => {
  const trimmed = value.trim()

  if (trimmed.length === 0) return null

  if (valueType === 'boolean') {
    const normalized = trimmed.toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
    return null
  }

  if (valueType === 'number') {
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return trimmed
}

const arePrimitiveValuesEqual = (left: CustomFieldPrimitive, right: CustomFieldPrimitive) => left === right

const serializeCustomFieldValue = (value: CustomFieldPrimitive) => String(value)

export const inventoryPageSizeOptions = [10, 20, 50]

export const hasInventoryCustomFieldSearchParams = (searchParams: URLSearchParams) => (
  Array.from(searchParams.keys()).some((key) => key.startsWith(customFieldParamPrefix))
)

export const parseInventoryUrlState = (searchParams: URLSearchParams) => ({
  stockFilter: parseInventoryStockFilter(searchParams.get('stock')),
  page: parsePositiveInteger(searchParams.get('page'), defaultInventoryUrlState.page),
  pageSize: parseInventoryPageSize(searchParams.get('pageSize')),
  sortField: parseInventorySortField(searchParams.get('sortField')),
  sortDir: parseInventorySortDirection(searchParams.get('sortDir')),
})

export const parseInventoryCustomFieldFilters = (
  searchParams: URLSearchParams,
  customFieldFilters: CustomFieldFilterOption[],
): CustomFieldActiveFilter[] => {
  const activeFilters: CustomFieldActiveFilter[] = []

  for (const customFieldFilter of customFieldFilters) {
    const rawValue = searchParams.get(`${customFieldParamPrefix}${customFieldFilter.key}`)

    if (rawValue === null) continue

    const parsedValue = parseCustomFieldValue(rawValue, customFieldFilter.valueType)
    if (parsedValue === null) continue

    const matchingValue = customFieldFilter.values.find((value) => arePrimitiveValuesEqual(value, parsedValue))
    if (matchingValue === undefined) continue

    activeFilters.push({ key: customFieldFilter.key, value: matchingValue })
  }

  return activeFilters
}

export const createInventorySearchParams = (
  currentSearchParams: URLSearchParams,
  state: InventoryUrlState,
) => {
  const nextSearchParams = new URLSearchParams(currentSearchParams)

  nextSearchParams.delete('stock')
  nextSearchParams.delete('page')
  nextSearchParams.delete('pageSize')
  nextSearchParams.delete('sortField')
  nextSearchParams.delete('sortDir')

  Array.from(nextSearchParams.keys())
    .filter((key) => key.startsWith(customFieldParamPrefix))
    .forEach((key) => nextSearchParams.delete(key))

  if (state.stockFilter !== defaultInventoryUrlState.stockFilter) {
    nextSearchParams.set('stock', state.stockFilter)
  }

  if (state.page !== defaultInventoryUrlState.page) {
    nextSearchParams.set('page', String(state.page))
  }

  if (state.pageSize !== defaultInventoryUrlState.pageSize) {
    nextSearchParams.set('pageSize', String(state.pageSize))
  }

  if (state.sortField !== defaultInventoryUrlState.sortField) {
    nextSearchParams.set('sortField', state.sortField)
  }

  if (state.sortDir !== defaultInventoryUrlState.sortDir) {
    nextSearchParams.set('sortDir', state.sortDir)
  }

  ;[...state.activeCustomFieldFilters]
    .sort((left, right) => left.key.localeCompare(right.key))
    .forEach((filter) => {
      nextSearchParams.set(`${customFieldParamPrefix}${filter.key}`, serializeCustomFieldValue(filter.value))
    })

  return nextSearchParams
}