export type AppLabel = 'ETL' | 'StoQR'
export type FinancialAppLabel = AppLabel | 'Bundle'

export const formatAppCode = (code: string | null | undefined): AppLabel =>
  code?.toUpperCase() === 'STOQR' ? 'StoQR' : 'ETL'

export const formatFinancialAppCode = (code: string | null | undefined, isBundle: boolean): FinancialAppLabel =>
  isBundle ? 'Bundle' : formatAppCode(code)
