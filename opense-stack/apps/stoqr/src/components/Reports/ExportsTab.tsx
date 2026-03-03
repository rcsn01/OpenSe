import { formatCurrency } from '../../utils'

type ExportProduct = {
  sku: string
  name: string
  quantity_on_hand: number
  cost_price: number | null
}

type ExportTransaction = {
  created_at: string
  transaction_type: string
  quantity_change: number
  notes: string | null
  products: { sku: string; name: string } | null
}

const buildCsv = (rows: string[][]) => rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')

const downloadBlob = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export const ExportsTab = ({
  products,
  transactions,
  startDate,
  endDate,
}: {
  products: ExportProduct[]
  transactions: ExportTransaction[]
  startDate: string
  endDate: string
}) => {
  const exportValuationCsv = () => {
    const rows = [
      ['SKU', 'Name', 'Quantity', 'Cost Price', 'Total Value'],
      ...products.map((product) => [
        product.sku,
        product.name,
        String(product.quantity_on_hand),
        String(product.cost_price ?? 0),
        String(product.quantity_on_hand * (product.cost_price ?? 0)),
      ]),
    ]

    downloadBlob('inventory-valuation.csv', buildCsv(rows), 'text/csv;charset=utf-8')
  }

  const exportMovementsCsv = () => {
    const rows = [
      ['Timestamp', 'Type', 'Product', 'SKU', 'Quantity Change', 'Notes'],
      ...transactions.map((row) => [
        row.created_at,
        row.transaction_type,
        row.products?.name ?? '',
        row.products?.sku ?? '',
        String(row.quantity_change),
        row.notes ?? '',
      ]),
    ]

    downloadBlob('stock-movements.csv', buildCsv(rows), 'text/csv;charset=utf-8')
  }

  const exportPdfSummary = () => {
    const totalValue = products.reduce((sum, product) => sum + product.quantity_on_hand * (product.cost_price ?? 0), 0)
    const totalOut = transactions.filter((row) => row.quantity_change < 0).reduce((sum, row) => sum + Math.abs(row.quantity_change), 0)

    const html = `
      <html>
        <head><title>StoQR Report Summary</title></head>
        <body>
          <h1>StoQR Report Summary</h1>
          <p>Date range: ${startDate || 'All'} to ${endDate || 'All'}</p>
          <p>Total inventory value: ${formatCurrency(totalValue)}</p>
          <p>Total stock out: ${totalOut}</p>
          <p>Total products: ${products.length}</p>
          <p>Total transactions in range: ${transactions.length}</p>
        </body>
      </html>
    `

    const popup = window.open('', '_blank')
    if (!popup) return
    popup.document.write(html)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h3 className="section-title">Export to CSV / PDF</h3>
        <div className="small muted">Exports use the currently selected date range.</div>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <button className="button" onClick={exportValuationCsv}>Export Valuation CSV</button>
          <button className="button" onClick={exportMovementsCsv}>Export Movements CSV</button>
          <button className="button secondary" onClick={exportPdfSummary}>Export PDF Summary</button>
        </div>
      </div>
    </div>
  )
}
