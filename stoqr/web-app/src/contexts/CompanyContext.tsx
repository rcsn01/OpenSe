import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { CompanyOption } from '../types'

type CompanyContextValue = {
  companyId: string | null
  companyName: string | null
  companies: CompanyOption[]
  isLoading: boolean
  setCompanyId: (value: string) => void
  refreshCompanies: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined)

const STORAGE_KEY = 'fts_selected_company'

export const CompanyProvider = ({
  children,
  userId,
}: {
  children: React.ReactNode
  userId: string
}) => {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [companyId, setCompanyIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshCompanies = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('company_members')
      .select('company_id, companies (id, name)')
      .eq('user_id', userId)

    if (error) {
      console.error(error)
      setCompanies([])
      setIsLoading(false)
      return
    }

    const options = (data ?? [])
      .map((item: any) => ({
        id: item.companies?.id ?? item.company_id,
        name: item.companies?.name ?? 'Unknown',
      }))
      .filter((item) => item.id)

    setCompanies(options)

    const stored = localStorage.getItem(STORAGE_KEY)
    const fallback = options[0]?.id ?? null
    const next = stored && options.some((option) => option.id === stored) ? stored : fallback
    setCompanyIdState(next)
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    refreshCompanies()
  }, [refreshCompanies])

  const setCompanyId = (value: string) => {
    setCompanyIdState(value)
    localStorage.setItem(STORAGE_KEY, value)
  }

  const companyName = useMemo(() => {
    return companies.find((company) => company.id === companyId)?.name ?? null
  }, [companies, companyId])

  const value = useMemo(
    () => ({ companyId, companyName, companies, isLoading, setCompanyId, refreshCompanies }),
    [companyId, companyName, companies, isLoading],
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
