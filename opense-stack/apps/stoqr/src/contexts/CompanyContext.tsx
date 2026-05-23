import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchUserCompanies } from '../api/company'
import type { CompanyOption } from '../types'

type CompanyContextValue = {
  companyId: string | null
  companyName: string | null
  companies: CompanyOption[]
  isLoading: boolean
  loadError: Error | null
  setCompanyId: (value: string) => void
  refreshCompanies: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined)

const STORAGE_KEY = 'fts_selected_company'

export const CompanyProvider = ({
  children,
  userId,
}: {
  children: ReactNode
  userId: string
}) => {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [companyId, setCompanyIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refreshCompanies = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const options = await fetchUserCompanies(userId)

      setCompanies(options)

      const stored = localStorage.getItem(STORAGE_KEY)
      const fallback = options[0]?.id ?? null
      const next = stored && options.some((option) => option.id === stored) ? stored : fallback
      setCompanyIdState(next)
    } catch (error) {
      console.error(error)
      setLoadError(error instanceof Error ? error : new Error('Failed to load companies.'))
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refreshCompanies()
  }, [refreshCompanies])

  const setCompanyId = useCallback((value: string) => {
    setCompanyIdState(value)
    localStorage.setItem(STORAGE_KEY, value)
  }, [])

  const companyName = useMemo(() => {
    return companies.find((company) => company.id === companyId)?.name ?? null
  }, [companies, companyId])

  const value = useMemo(
    () => ({ companyId, companyName, companies, isLoading, loadError, setCompanyId, refreshCompanies }),
    [companyId, companyName, companies, isLoading, loadError, refreshCompanies, setCompanyId],
  )

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

export const useCompany = () => {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider')
  }
  return context
}
