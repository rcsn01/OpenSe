import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabaseClient'
import type { CompanyOption } from '../types'

type MembershipRow = {
  org_id: string
  organisations: { id: string; name: string } | { id: string; name: string }[] | null
}

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

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
  children: ReactNode
  userId: string
}) => {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [companyId, setCompanyIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshCompanies = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('organisation_members')
      .select('org_id, organisations(id, name)')
      .eq('user_id', userId)

    if (error) {
      console.error(error)
      setCompanies([])
      setIsLoading(false)
      return
    }

    const options = ((data ?? []) as MembershipRow[])
      .map((item) => {
        const organisation = normalizeSingle(item.organisations)
        return {
          id: organisation?.id ?? item.org_id,
          name: organisation?.name ?? 'Unknown',
        }
      })
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
