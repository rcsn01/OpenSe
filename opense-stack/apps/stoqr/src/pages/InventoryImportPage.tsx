import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { toast } from 'sonner'

import type { ImportInventoryColumnField, ImportInventoryColumnMappings, ImportInventoryResult } from '../api/inventory'
import { BasePage } from '../components/BasePage'
import { useCompany } from '../contexts/CompanyContext'
import { useImportInventoryProducts, useInventoryFilters } from '../hooks/queries/useInventory'
import { parseCsv } from '../utils'

type CsvRow = Record<string, string>

const IMPORT_COLUMN_FIELDS: Array<{ key: ImportInventoryColumnField; label: string; required?: boolean }> = [
  { key: 'name', label: 'Product Name Column', required: true },
  { key: 'sku', label: 'SKU Column', required: true },
  { key: 'description', label: 'Description Column' },
  { key: 'cost_price', label: 'Cost Price Column' },
  { key: 'selling_price', label: 'Selling Price Column' },
  { key: 'quantity_on_hand', label: 'Initial Stock Column' },
  { key: 'reorder_point', label: 'Low Stock Alert Column' },
]

const EMPTY_COLUMN_MAPPINGS: ImportInventoryColumnMappings = {
  name: null,
  sku: null,
  description: null,
  cost_price: null,
  selling_price: null,
  quantity_on_hand: null,
  reorder_point: null,
}

const normalizeHeaderName = (header: string) => header.toLowerCase().replace(/[^a-z0-9]+/g, '')

const buildSuggestedMappings = (headers: string[]): ImportInventoryColumnMappings => {
  const aliases: Record<ImportInventoryColumnField, string[]> = {
    name: ['name', 'productname', 'itemname', 'product'],
    sku: ['sku', 'productsku', 'itemsku', 'code'],
    description: ['description', 'details', 'productdescription'],
    cost_price: ['costprice', 'cost', 'buyprice', 'purchaseprice'],
    selling_price: ['sellingprice', 'price', 'saleprice', 'retailprice'],
    quantity_on_hand: ['initialstock', 'quantityonhand', 'qty', 'quantity', 'stock', 'openingstock'],
    reorder_point: ['lowstockalert', 'lowstock', 'reorderpoint', 'reorderlevel', 'threshold'],
  }
  const usedHeaders = new Set<string>()

  return IMPORT_COLUMN_FIELDS.reduce<ImportInventoryColumnMappings>((acc, field) => {
    const matchedHeader = headers.find((header) => {
      if (usedHeaders.has(header)) {
        return false
      }

      return aliases[field.key].includes(normalizeHeaderName(header))
    }) ?? null

    if (matchedHeader) {
      usedHeaders.add(matchedHeader)
    }

    acc[field.key] = matchedHeader
    return acc
  }, { ...EMPTY_COLUMN_MAPPINGS })
}

export const InventoryImportPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const filtersQuery = useInventoryFilters(companyId)
  const importProductsMutation = useImportInventoryProducts(companyId)

  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CsvRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [columnMappings, setColumnMappings] = useState<ImportInventoryColumnMappings>(EMPTY_COLUMN_MAPPINGS)
  const [attributeColumns, setAttributeColumns] = useState<string[]>([])
  const [resultSummary, setResultSummary] = useState<ImportInventoryResult | null>(null)

  const previewRows = useMemo(() => rows.slice(0, 5), [rows])
  const folders = filtersQuery.data?.folders ?? []
  const assignedHeaders = useMemo(
    () => Object.values(columnMappings).filter((value): value is string => Boolean(value)),
    [columnMappings],
  )
  const assignedHeaderSet = useMemo(() => new Set(assignedHeaders), [assignedHeaders])
  const attributeCandidates = useMemo(
    () => headers.filter((header) => !assignedHeaderSet.has(header)),
    [assignedHeaderSet, headers],
  )
  const missingRequiredFields = useMemo(
    () => IMPORT_COLUMN_FIELDS.filter((field) => field.required && !columnMappings[field.key]),
    [columnMappings],
  )
  const canImport = rows.length > 0 && selectedFolderId !== '' && missingRequiredFields.length === 0 && !importProductsMutation.isPending

  useEffect(() => {
    const nextMappings = buildSuggestedMappings(headers)
    const nextAssigned = new Set(Object.values(nextMappings).filter((value): value is string => Boolean(value)))

    setColumnMappings(nextMappings)
    setAttributeColumns(headers.filter((header) => !nextAssigned.has(header)))
    setResultSummary(null)
  }, [headers])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const content = await file.text()
    const next = parseCsv(content)

    setFileName(file.name)
    setHeaders(next.headers)
    setRows(next.rows)
    setMessage(next.rows.length > 0 ? null : 'No rows found in this CSV.')
    setResultSummary(null)
  }

  const handleMappingChange = (field: ImportInventoryColumnField, nextHeader: string) => {
    setColumnMappings((current) => {
      const nextMappings = { ...current }

      for (const key of Object.keys(nextMappings) as ImportInventoryColumnField[]) {
        if (key !== field && nextMappings[key] === nextHeader) {
          nextMappings[key] = null
        }
      }

      nextMappings[field] = nextHeader || null
      return nextMappings
    })

    if (nextHeader) {
      setAttributeColumns((current) => current.filter((column) => column !== nextHeader))
    }
  }

  const toggleAttributeColumn = (column: string) => {
    setAttributeColumns((current) => (
      current.includes(column)
        ? current.filter((value) => value !== column)
        : [...current, column]
    ))
  }

  const handleImport = async () => {
    if (!rows.length) {
      setMessage('Upload a CSV before importing.')
      return
    }

    if (selectedFolderId === '') {
      setMessage('Choose a destination folder before importing.')
      return
    }

    if (missingRequiredFields.length > 0) {
      setMessage(`Map ${missingRequiredFields.map((field) => field.label.replace(' Column', '')).join(' and ')} before importing.`)
      return
    }

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

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to import products."
      contentStyle={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      containerClassName="stack"
      containerStyle={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}
    >
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="button ghost small" type="button" onClick={() => navigate('/inventory/all')}>
          <ArrowLeft size={14} />
          Back to Inventory
        </button>
        <span className="small muted">Upload, map, and import</span>
      </div>

      <div className="card stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Import Products from CSV</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Upload a CSV to preview the data before mapping product fields, attributes, and destination folder.
          </p>
        </div>

        <label
          className="stack"
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 12,
            padding: 20,
            background: 'var(--surface, #fff)',
            cursor: 'pointer',
            gap: 10,
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(148, 163, 184, 0.12)',
                color: 'var(--color-foreground)',
              }}
            >
              <Upload size={18} />
            </span>
            <div className="stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600 }}>Choose CSV file</span>
              <span className="small muted">Headers will be used for column mapping in the next step.</span>
            </div>
          </div>
          <input
            aria-label="Upload product CSV"
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
          {fileName && <span className="small muted">Loaded file: {fileName}</span>}
        </label>

        {message && <div className="pill">{message}</div>}

        {headers.length > 0 && (
          <div className="grid grid-2" style={{ gap: 16 }}>
            <div className="card stack" style={{ boxShadow: 'none', background: '#f8fafc', gap: 12 }}>
              <div className="stack" style={{ gap: 2 }}>
                <h3 className="section-title" style={{ margin: 0 }}>Import Mapping</h3>
                <span className="small muted">Choose which CSV columns populate each product field.</span>
              </div>

              <label className="stack">
                <span className="small font-semibold">Destination Folder</span>
                <select
                  aria-label="Destination Folder"
                  className="select"
                  value={selectedFolderId}
                  onChange={(event) => setSelectedFolderId(event.target.value)}
                  disabled={filtersQuery.isLoading}
                >
                  <option value="">Choose folder</option>
                  <option value="__root__">Root Directory</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-2" style={{ gap: 12 }}>
                {IMPORT_COLUMN_FIELDS.map((field) => (
                  <label key={field.key} className="stack">
                    <span className="small font-semibold">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>
                    <select
                      aria-label={field.label}
                      className="select"
                      value={columnMappings[field.key] ?? ''}
                      onChange={(event) => handleMappingChange(field.key, event.target.value)}
                    >
                      <option value="">Not mapped</option>
                      {headers.map((header) => (
                        <option key={`${field.key}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div className="stack" style={{ gap: 8 }}>
                <span className="small font-semibold">Attribute Columns</span>
                <span className="small muted">Selected columns will be imported into product attributes using the CSV header as the attribute key.</span>
                <div className="stack" style={{ gap: 8 }}>
                  {attributeCandidates.length === 0 ? (
                    <span className="small muted">No remaining columns are available for attributes.</span>
                  ) : (
                    attributeCandidates.map((column) => (
                      <label key={column} className="row" style={{ gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={attributeColumns.includes(column)}
                          onChange={() => toggleAttributeColumn(column)}
                        />
                        <span>{column}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="card stack" style={{ boxShadow: 'none', background: '#f8fafc', gap: 12 }}>
              <div className="stack" style={{ gap: 2 }}>
                <h3 className="section-title" style={{ margin: 0 }}>Import Checks</h3>
                <span className="small muted">Name and SKU mappings are required. Low Stock Alert imports into reorder point.</span>
              </div>

              <div className="stack" style={{ gap: 6 }}>
                <span className="small muted">Detected headers: {headers.length}</span>
                <span className="small muted">Selected attributes: {attributeColumns.length}</span>
                <span className="small muted">Destination: {selectedFolderId === '' ? 'Not selected' : selectedFolderId === '__root__' ? 'Root Directory' : folders.find((folder) => folder.id === selectedFolderId)?.name ?? 'Selected folder'}</span>
              </div>

              {missingRequiredFields.length > 0 && (
                <div className="pill">Required mappings missing: {missingRequiredFields.map((field) => field.label.replace(' Column', '')).join(', ')}</div>
              )}

              {resultSummary && (
                <div className="stack" style={{ gap: 6 }}>
                  <h4 style={{ margin: 0 }}>Last Import Result</h4>
                  <span className="small muted">Imported: {resultSummary.importedCount}</span>
                  <span className="small muted">Skipped duplicates: {resultSummary.duplicateCount}</span>
                  <span className="small muted">Invalid rows: {resultSummary.invalidCount}</span>
                  {resultSummary.duplicateSkus.length > 0 && (
                    <span className="small muted">Duplicate SKUs: {resultSummary.duplicateSkus.join(', ')}</span>
                  )}
                </div>
              )}

              <button
                className="button"
                type="button"
                onClick={handleImport}
                disabled={!canImport}
              >
                {importProductsMutation.isPending ? 'Importing…' : 'Import Products'}
              </button>
            </div>
          </div>
        )}

        {headers.length > 0 && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="flex-between">
              <div className="stack" style={{ gap: 2 }}>
                <h3 className="section-title" style={{ margin: 0 }}>Preview</h3>
                <span className="small muted">{rows.length} rows detected</span>
              </div>
              <span className="small muted">Showing first {previewRows.length} rows</span>
            </div>

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ background: 'rgba(148, 163, 184, 0.08)' }}>
                    {headers.map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          fontSize: 'var(--type-size-xs)',
                          fontWeight: 'var(--type-weight-semibold)',
                          color: 'var(--muted)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={`${fileName ?? 'csv'}-${index}`}>
                      {headers.map((header) => (
                        <td
                          key={`${header}-${index}`}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid var(--border)',
                            verticalAlign: 'top',
                            fontSize: 'var(--type-size-sm)',
                          }}
                        >
                          {row[header] || <span className="small muted">Empty</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </BasePage>
  )
}