import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchUserOpenKbOrganisations } from '../api/organisations'
import type { OrganisationOption } from '../types'

type OrganisationContextValue = {
  organisationId: string | null
  organisationName: string | null
  organisations: OrganisationOption[]
  isLoading: boolean
  loadError: Error | null
  setOrganisationId: (value: string) => void
  refreshOrganisations: () => Promise<void>
}

const OrganisationContext = createContext<OrganisationContextValue | undefined>(undefined)

const STORAGE_KEY = 'open_kb_selected_organisation'

export const OrganisationProvider = ({
  children,
  userId,
}: {
  children: ReactNode
  userId: string
}) => {
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([])
  const [organisationId, setOrganisationIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refreshOrganisations = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const options = await fetchUserOpenKbOrganisations(userId)
      setOrganisations(options)

      const stored = localStorage.getItem(STORAGE_KEY)
      const fallback = options[0]?.id ?? null
      const next = stored && options.some((option) => option.id === stored) ? stored : fallback
      setOrganisationIdState(next)
    } catch (error) {
      console.error(error)
      setLoadError(error instanceof Error ? error : new Error('Failed to load organisations.'))
      setOrganisations([])
      setOrganisationIdState(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refreshOrganisations()
  }, [refreshOrganisations])

  const setOrganisationId = useCallback((value: string) => {
    setOrganisationIdState(value)
    localStorage.setItem(STORAGE_KEY, value)
  }, [])

  const organisationName = useMemo(() => {
    return organisations.find((organisation) => organisation.id === organisationId)?.name ?? null
  }, [organisationId, organisations])

  const value = useMemo(
    () => ({
      organisationId,
      organisationName,
      organisations,
      isLoading,
      loadError,
      setOrganisationId,
      refreshOrganisations,
    }),
    [
      organisationId,
      organisationName,
      organisations,
      isLoading,
      loadError,
      setOrganisationId,
      refreshOrganisations,
    ],
  )

  return <OrganisationContext.Provider value={value}>{children}</OrganisationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useOrganisation = () => {
  const context = useContext(OrganisationContext)
  if (!context) {
    throw new Error('useOrganisation must be used within OrganisationProvider')
  }
  return context
}
