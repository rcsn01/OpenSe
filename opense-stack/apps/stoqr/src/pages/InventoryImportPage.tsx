import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, FileSpreadsheet, FolderOpen, Upload } from 'lucide-react'
import { toast } from 'sonner'

import type { ImportInventoryColumnField, ImportInventoryColumnMappings, ImportInventoryResult } from '../api/inventory'
import { BasePage } from '../components/BasePage'
import { useCompany } from '../contexts/CompanyContext'
import { useImportInventoryProducts, useInventoryFilters } from '../hooks/queries/useInventory'
import { parseCsv } from '../utils'

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
        contentStyle={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
        containerClassName="inventory-import-layout"
        containerStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <input
          ref={fileInputRef}
          aria-label="Upload product CSV"
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="inventory-import-empty-state">
          <div className="inventory-import-empty-card">
            <div className="inventory-import-empty-icon">
              <FileSpreadsheet size={26} />
            </div>
            <div className="stack" style={{ gap: 6, alignItems: 'center' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Start with a CSV file</h2>
              <p className="small muted" style={{ margin: 0, maxWidth: 420, textAlign: 'center' }}>
                Choose a CSV to enter the mapping workspace. Once it loads, the table headers become the import form.
              </p>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="button" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                Choose CSV
              </button>
              <button className="button ghost" type="button" onClick={() => navigate('/inventory/all')}>
                <ArrowLeft size={16} />
                Back to Inventory
              </button>
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
      contentStyle={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}
      containerClassName="inventory-import-layout"
      containerStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
    >
      <input
        ref={fileInputRef}
        aria-label="Upload product CSV"
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="inventory-import-shell">
        <div className="inventory-import-topbar">
          <div className="inventory-import-topbar-main">
            <div className="stack" style={{ gap: 4 }}>
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
            <table className="inventory-import-table">
              <thead>
                <tr>
                  {headers.map((header) => {
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
                {previewRows.map((row, rowIndex) => (
                  <tr key={`${fileName}-${rowIndex}`}>
                    {headers.map((header) => {
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
          </div>

          <div className="inventory-import-footer">
            End of preview. Showing {previewRows.length} of {rows.length} rows.
          </div>
        </div>
      </div>
    </BasePage>
  )
}