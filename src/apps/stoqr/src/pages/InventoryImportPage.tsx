import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, FileSpreadsheet, FolderOpen, Upload } from 'lucide-react'
import { Button } from '@repo/ui'
import { toast } from 'sonner'

import type { ImportInventoryColumnField, ImportInventoryColumnMappings, ImportInventoryResult } from '../api/inventory'
import { BasePage } from '../components/BasePage'
import { usePageTopBarSearch, useTopBarSearchValue } from '../components/Search/TopBarSearch'
import { useCompany } from '../contexts/CompanyContext'
import { useImportInventoryProducts, useInventoryFilters } from '../hooks/queries/useInventory'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../lib/pageSearch'
import { parseCsv } from '../utils'
import '../components/Inventory/InventorySurface.css'

type CsvRow = Record<string, string>
type ColumnAssignment = 'ignore' | 'attribute' | ImportInventoryColumnField
type InventoryImportLocationState = {
  csvUpload?: {
    fileName: string
    headers: string[]
    rows: CsvRow[]
    initialFolderId?: string | null
  }
}

const IMPORT_COLUMN_FIELDS: Array<{
  key: ImportInventoryColumnField
  label: string
  shortLabel: string
  required?: boolean
}> = [
  { key: 'name', label: 'Product Name', shortLabel: 'Product Name', required: true },
  { key: 'sku', label: 'SKU', shortLabel: 'SKU' },
  { key: 'description', label: 'Description', shortLabel: 'Description' },
  { key: 'cost_price', label: 'Cost Price', shortLabel: 'Cost Price' },
  { key: 'selling_price', label: 'Selling Price', shortLabel: 'Selling Price' },
  { key: 'quantity_on_hand', label: 'Initial Stock', shortLabel: 'Initial Stock' },
  { key: 'reorder_point', label: 'Low Stock Alert', shortLabel: 'Low Stock Alert' },
]

const normalizeHeaderName = (header: string) => header.toLowerCase().replace(/[^a-z0-9]+/g, '')

const buildSuggestedAssignments = (headers: string[]): Record<string, ColumnAssignment> => {
  const aliases: Record<ImportInventoryColumnField, string[]> = {
    name: ['name', 'productname', 'itemtitle', 'itemname', 'product', 'title'],
    sku: ['sku', 'itemcode', 'productsku', 'itemsku', 'code'],
    description: ['description', 'details', 'productdescription'],
    cost_price: ['costprice', 'purchasecost', 'cost', 'buyprice', 'purchaseprice'],
    selling_price: ['sellingprice', 'retailprice', 'price', 'saleprice', 'retail'],
    quantity_on_hand: ['initialstock', 'quantityonhand', 'qty', 'quantity', 'stock', 'openingstock'],
    reorder_point: ['lowstockalert', 'lowstock', 'reorderpoint', 'reorderlevel', 'threshold'],
  }

  const assignments = headers.reduce<Record<string, ColumnAssignment>>((acc, header) => {
    acc[header] = 'ignore'
    return acc
  }, {})
  const usedFields = new Set<ImportInventoryColumnField>()

  headers.forEach((header) => {
    const normalizedHeader = normalizeHeaderName(header)
    const matchedField = IMPORT_COLUMN_FIELDS.find((field) => (
      !usedFields.has(field.key) && aliases[field.key].includes(normalizedHeader)
    ))

    if (matchedField) {
      assignments[header] = matchedField.key
      usedFields.add(matchedField.key)
    }
  })

  return assignments
}

const getFillRateTone = (fillRate: number) => {
  if (fillRate >= 95) return 'success'
  if (fillRate >= 75) return 'warning'
  return 'danger'
}

export const InventoryImportPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const { searchValue } = useTopBarSearchValue()
  const filtersQuery = useInventoryFilters(companyId)
  const importProductsMutation = useImportInventoryProducts(companyId)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState('__root__')
  const [columnAssignments, setColumnAssignments] = useState<Record<string, ColumnAssignment>>({})
  const [resultSummary, setResultSummary] = useState<ImportInventoryResult | null>(null)

  const previewRows = useMemo(() => rows.slice(0, 10), [rows])
  const normalizedSearchValue = normalizePageSearchTerm(searchValue)
  const folders = filtersQuery.data?.folders ?? []
  const assignedCoreFields = useMemo(
    () => IMPORT_COLUMN_FIELDS.reduce<Partial<Record<ImportInventoryColumnField, string>>>((acc, field) => {
      const assignedHeader = headers.find((header) => columnAssignments[header] === field.key)

      if (assignedHeader) {
        acc[field.key] = assignedHeader
      }

      return acc
    }, {}),
    [columnAssignments, headers],
  )
  const productNameMapped = Boolean(assignedCoreFields.name)
  const canImport = rows.length > 0 && productNameMapped && !importProductsMutation.isPending

  const columnStats = useMemo(
    () => headers.reduce<Record<string, { percent: number; tone: string }>>((acc, header) => {
      const filled = rows.reduce((count, row) => count + (row[header]?.trim() ? 1 : 0), 0)
      const percent = rows.length === 0 ? 0 : Math.round((filled / rows.length) * 100)

      acc[header] = {
        percent,
        tone: getFillRateTone(percent),
      }

      return acc
    }, {}),
    [headers, rows],
  )
  const searchableColumns = useMemo(
    () => headers.map((header) => ({
      header,
      values: previewRows.map((row) => row[header] ?? ''),
    })),
    [headers, previewRows],
  )
  const headerMatches = useMemo(
    () => fuzzySearchItems(searchableColumns, normalizedSearchValue, [
      {
        key: (column) => column.header,
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
    ]).map((column) => column.header),
    [normalizedSearchValue, searchableColumns],
  )
  const valueMatchedHeaders = useMemo(
    () => fuzzySearchItems(searchableColumns, normalizedSearchValue, [
      {
        key: (column) => column.values,
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]).map((column) => column.header),
    [normalizedSearchValue, searchableColumns],
  )
  const visibleHeaders = useMemo(() => {
    if (normalizedSearchValue.length === 0) {
      return headers
    }

    return Array.from(new Set([...headerMatches, ...valueMatchedHeaders]))
  }, [headerMatches, headers, normalizedSearchValue, valueMatchedHeaders])
  const visiblePreviewRows = useMemo(() => {
    if (normalizedSearchValue.length === 0) {
      return previewRows
    }

    if (visibleHeaders.length === 0) {
      return []
    }

    if (headerMatches.length > 0) {
      return previewRows
    }

    return fuzzySearchItems(previewRows, normalizedSearchValue, visibleHeaders.map((header) => ({
      key: (row: CsvRow) => row[header] ?? '',
      maxRanking: fuzzyRankings.CONTAINS,
    })))
  }, [headerMatches.length, normalizedSearchValue, previewRows, visibleHeaders])
  const importSuggestions = useMemo(
    () => [
      ...(fileName
        ? [
            {
              id: 'inventory-import-current-file',
              title: fileName,
              subtitle: `${rows.length} rows loaded for mapping`,
              value: fileName,
              badge: 'Import',
            },
          ]
        : [
            {
              id: 'inventory-import-upload',
              title: 'Upload Product CSV',
              subtitle: 'Start by loading a CSV into the mapping workspace',
              value: 'csv upload',
              badge: 'Import',
            },
          ]),
      ...headers.slice(0, 6).map((header) => ({
        id: `inventory-import-header-${header}`,
        title: header,
        subtitle: `${columnStats[header]?.percent ?? 0}% fill rate`,
        value: header,
        badge: 'Column',
      })),
    ],
    [columnStats, fileName, headers, rows.length],
  )

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'inventory-import',
    placeholder: 'Search import data...',
    defaultSuggestions: [
      {
        id: 'inventory-import-product-name',
        title: 'Product Name',
        subtitle: 'Required column for importing products',
        value: 'product name',
        badge: 'Column',
      },
      {
        id: 'inventory-import-sku',
        title: 'SKU',
        subtitle: 'Optional unique identifier column',
        value: 'sku',
        badge: 'Column',
      },
    ],
    suggestions: importSuggestions,
  }), [importSuggestions]))

  useEffect(() => {
    const upload = (location.state as InventoryImportLocationState | null)?.csvUpload

    if (!upload) {
      return
    }

    setFileName(upload.fileName)
    setHeaders(upload.headers)
    setRows(upload.rows)
    setSelectedFolderId(upload.initialFolderId ?? '__root__')
    setColumnAssignments(buildSuggestedAssignments(upload.headers))
    setMessage(null)
    setResultSummary(null)
  }, [location.state])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const content = await file.text()
    const next = parseCsv(content)

    if (next.headers.length === 0 || next.rows.length === 0) {
      setMessage('No rows found in this CSV.')
      toast.error('No rows found in this CSV.')
      event.target.value = ''
      return
    }

    setFileName(file.name)
    setHeaders(next.headers)
    setRows(next.rows)
    setSelectedFolderId('__root__')
    setColumnAssignments(buildSuggestedAssignments(next.headers))
    setMessage(next.rows.length > 0 ? null : 'No rows found in this CSV.')
    setResultSummary(null)
    event.target.value = ''
  }

  const handleAssignmentChange = (header: string, nextAssignment: ColumnAssignment) => {
    setColumnAssignments((current) => ({
      ...current,
      [header]: nextAssignment,
    }))

    setMessage(null)
    setResultSummary(null)
  }

  const handleImport = async () => {
    if (!rows.length) {
      setMessage('Upload a CSV before importing.')
      return
    }

    if (!productNameMapped) {
      setMessage('Map the Product Name column before importing.')
      return
    }

    const columnMappings: ImportInventoryColumnMappings = {
      name: null,
      sku: null,
      description: null,
      cost_price: null,
      selling_price: null,
      quantity_on_hand: null,
      reorder_point: null,
    }
    const attributeColumns: string[] = []

    headers.forEach((header) => {
      const assignment = columnAssignments[header]

      if (!assignment || assignment === 'ignore') {
        return
      }

      if (assignment === 'attribute') {
        attributeColumns.push(header)
        return
      }

      columnMappings[assignment] = header
    })

    setMessage(null)

    try {
      const result = await importProductsMutation.mutateAsync({
        rows,
        folderId: selectedFolderId === '__root__' ? null : selectedFolderId,
        columnMappings,
        attributeColumns,
      })

      setResultSummary(result)

      if (result.importedCount > 0) {
        toast.success(`Imported ${result.importedCount} product${result.importedCount === 1 ? '' : 's'}.`)
      }

      if (result.duplicateCount > 0) {
        toast.warning(`Skipped ${result.duplicateCount} duplicate SKU row${result.duplicateCount === 1 ? '' : 's'}.`)
      }

      if (result.importedCount === 0 && result.invalidCount > 0 && result.duplicateCount === 0) {
        toast.error('No valid rows could be imported.')
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Import failed.'
      setMessage(nextMessage)
      toast.error(nextMessage)
    }
  }

  if (!fileName || headers.length === 0 || rows.length === 0) {
    return (
      <BasePage
        companyId={companyId}
        isLoading={false}
        emptyStateTitle="No company selected"
        emptyStateDescription="Select a company to import products."
        contentClassName="flex h-full min-h-0 flex-col"
        containerClassName="inventory-import-layout flex min-h-0 flex-1 flex-col"
      >
        <input
          ref={fileInputRef}
          aria-label="Upload product CSV"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="inventory-import-empty-state">
          <div className="inventory-import-empty-card">
            <div className="inventory-import-empty-icon">
              <FileSpreadsheet size={26} />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">Start with a CSV file</h2>
              <p className="max-w-[420px] text-center text-sm text-[var(--color-muted-foreground)]">
                Choose a CSV to enter the mapping workspace. Once it loads, the table headers become the import form.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                Choose CSV
              </Button>
              <Button variant="ghost" type="button" onClick={() => navigate('/inventory/all')}>
                <ArrowLeft size={16} />
                Back to Inventory
              </Button>
            </div>
            {message && <div className="inventory-import-banner inventory-import-banner-warning">{message}</div>}
          </div>
        </div>
      </BasePage>
    )
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to import products."
      contentClassName="flex h-full min-h-0 flex-col overflow-hidden"
      containerClassName="inventory-import-layout flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <input
        ref={fileInputRef}
        aria-label="Upload product CSV"
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="inventory-import-shell">
        <div className="inventory-import-topbar">
          <div className="inventory-import-topbar-main">
            <div className="flex flex-col gap-1">
              <h1 className="inventory-import-title">Map Columns</h1>
              <div className="inventory-import-meta">
                <span>{fileName}</span>
                <span>{rows.length} rows</span>
              </div>
            </div>
          </div>

          <div className="inventory-import-topbar-actions">
            <button className="inventory-import-link" type="button" onClick={() => fileInputRef.current?.click()}>
              Replace CSV
            </button>

            <label className="inventory-import-folder-picker">
              <FolderOpen size={14} />
              <select
                aria-label="Destination Folder"
                className="inventory-import-folder-select"
                value={selectedFolderId}
                onChange={(event) => setSelectedFolderId(event.target.value)}
                disabled={filtersQuery.isLoading}
              >
                <option value="__root__">Main Inventory</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>

            <button className="inventory-import-link" type="button" onClick={() => navigate('/inventory/all')}>
              Cancel
            </button>

            <button
              className="inventory-import-primary"
              type="button"
              onClick={handleImport}
              disabled={!canImport}
            >
              {importProductsMutation.isPending ? 'Importing…' : 'Import Products'}
            </button>
          </div>
        </div>

        {!productNameMapped && (
          <div className="inventory-import-banner inventory-import-banner-warning">
            Product Name is required before products can be imported.
          </div>
        )}

        {message && <div className="inventory-import-banner inventory-import-banner-warning">{message}</div>}

        {resultSummary && (
          <div className="inventory-import-banner inventory-import-banner-success">
            Imported {resultSummary.importedCount} products, skipped {resultSummary.duplicateCount} duplicates, and ignored {resultSummary.invalidCount} invalid rows.
            {resultSummary.duplicateSkus.length > 0 ? ` Duplicate SKUs: ${resultSummary.duplicateSkus.join(', ')}` : ''}
          </div>
        )}

        <div className="inventory-import-table-shell">
          <div className="inventory-import-table-scroll">
            {normalizedSearchValue.length > 0 && (
              visibleHeaders.length === 0 || visiblePreviewRows.length === 0
            ) ? (
              <div className="empty-state min-h-[220px]">
                No import columns or preview rows matched "{normalizedSearchValue}".
              </div>
            ) : (
              <table className="inventory-import-table">
                <thead>
                  <tr>
                    {visibleHeaders.map((header) => {
                      const assignment = columnAssignments[header] ?? 'ignore'
                      const isMapped = assignment !== 'ignore'

                      return (
                        <th key={header} className={`inventory-import-column${isMapped ? ' active' : ''}`}>
                          <div className="inventory-import-header-cell">
                            <select
                              aria-label={`Map ${header} column`}
                              className={`inventory-import-column-select${isMapped ? ' mapped' : ''}`}
                              value={assignment}
                              onChange={(event) => handleAssignmentChange(header, event.target.value as ColumnAssignment)}
                            >
                              <option value="ignore">Ignore column</option>
                              {IMPORT_COLUMN_FIELDS.map((field) => {
                                const assignedHeader = assignedCoreFields[field.key]

                                return (
                                  <option
                                    key={`${header}-${field.key}`}
                                    value={field.key}
                                    disabled={Boolean(assignedHeader && assignedHeader !== header)}
                                  >
                                    {field.shortLabel}{field.required ? ' *' : ''}
                                  </option>
                                )
                              })}
                              <option value="attribute">Custom Attribute</option>
                            </select>

                            <div className="inventory-import-header-meta">
                              <div className="inventory-import-header-label-row">
                                <span className="inventory-import-source-label">{header}</span>
                                {isMapped && <Check size={14} className="inventory-import-header-check" />}
                              </div>

                              <div className="inventory-import-fill-row">
                                <span>Fill rate</span>
                                <span>{columnStats[header]?.percent ?? 0}%</span>
                              </div>

                              <div className="inventory-import-fill-track">
                                <span
                                  className={`inventory-import-fill-bar ${columnStats[header]?.tone ?? 'danger'}`}
                                  style={{ width: `${columnStats[header]?.percent ?? 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visiblePreviewRows.map((row, rowIndex) => (
                    <tr key={`${fileName}-${rowIndex}`}>
                      {visibleHeaders.map((header) => {
                        const assignment = columnAssignments[header] ?? 'ignore'
                        const value = row[header]?.trim() ?? ''

                        return (
                          <td key={`${header}-${rowIndex}`} className={`inventory-import-cell${assignment !== 'ignore' ? ' active' : ''}`}>
                            {value || <span className="inventory-import-empty-cell">Empty</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="inventory-import-footer">
            End of preview. Showing {visiblePreviewRows.length} of {previewRows.length} preview rows and {visibleHeaders.length} of {headers.length} columns.
          </div>
        </div>
      </div>
    </BasePage>
  )
}
