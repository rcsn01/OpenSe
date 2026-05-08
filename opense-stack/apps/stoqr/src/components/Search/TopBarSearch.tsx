import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { topBarSearchParamKey, type SearchSuggestion } from '../../lib/pageSearch'
import { SearchCombobox } from './SearchCombobox'

export type PageTopBarSearchConfig = {
  searchKey: string
  enabled?: boolean
  placeholder: string
  emptyMessage?: string
  defaultSuggestions?: SearchSuggestion[]
  suggestions?: SearchSuggestion[]
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
}

type RegisteredSearchConfig = {
  config: PageTopBarSearchConfig
  order: number
}

type TopBarSearchContextValue = {
  activeConfig: PageTopBarSearchConfig | null
  mergedSuggestions: SearchSuggestion[]
  searchValue: string
  setSearchValue: (value: string) => void
  registerPageSearch: (registrationId: string, config: PageTopBarSearchConfig) => void
  unregisterPageSearch: (registrationId: string) => void
}

const TopBarSearchContext = createContext<TopBarSearchContextValue | null>(null)

const noopSetSearchValue = (_value: string) => undefined

const areSearchSuggestionsEqual = (left: SearchSuggestion[] = [], right: SearchSuggestion[] = []) => {
  if (left.length !== right.length) return false

  return left.every((suggestion, index) => {
    const other = right[index]

    if (!other) return false

    const leftKeywords = suggestion.keywords ?? []
    const rightKeywords = other.keywords ?? []

    return (
      suggestion.id === other.id &&
      suggestion.title === other.title &&
      suggestion.value === other.value &&
      suggestion.subtitle === other.subtitle &&
      suggestion.badge === other.badge &&
      leftKeywords.length === rightKeywords.length &&
      leftKeywords.every((keyword, keywordIndex) => keyword === rightKeywords[keywordIndex])
    )
  })
}

const arePageTopBarSearchConfigsEqual = (left: PageTopBarSearchConfig, right: PageTopBarSearchConfig) => (
  left.searchKey === right.searchKey &&
  left.enabled === right.enabled &&
  left.placeholder === right.placeholder &&
  left.emptyMessage === right.emptyMessage &&
  left.onSuggestionSelect === right.onSuggestionSelect &&
  areSearchSuggestionsEqual(left.defaultSuggestions, right.defaultSuggestions) &&
  areSearchSuggestionsEqual(left.suggestions, right.suggestions)
)

const mergeSuggestions = (config: PageTopBarSearchConfig | null) => {
  if (!config) return []

  const mergedSuggestions = [
    ...(config.defaultSuggestions ?? []),
    ...(config.suggestions ?? []),
  ]

  const seenIds = new Set<string>()
  return mergedSuggestions.filter((suggestion) => {
    if (seenIds.has(suggestion.id)) return false

    seenIds.add(suggestion.id)
    return true
  })
}

const buildEmptyMessage = (placeholder: string) => (
  `No ${placeholder.toLowerCase().replace(/^search\s+/, '')} found.`
)

const useTopBarSearchContext = () => useContext(TopBarSearchContext)
const useUrlSearchValue = () => {
  const location = useLocation()
  return new URLSearchParams(location.search).get(topBarSearchParamKey) ?? ''
}

export const TopBarSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [registrations, setRegistrations] = useState<Map<string, RegisteredSearchConfig>>(() => new Map())
  const nextOrderRef = useRef(0)
  const activeRegistration = useMemo(
    () => Array.from(registrations.values()).at(-1) ?? null,
    [registrations],
  )
  const activeConfig = activeRegistration?.config ?? null
  const urlSearchValue = useMemo(
    () => new URLSearchParams(location.search).get(topBarSearchParamKey) ?? '',
    [location.search],
  )
  const searchValue = activeConfig ? urlSearchValue : ''

  useEffect(() => {
    if (activeConfig !== null) return
    if (!searchParams.has(topBarSearchParamKey)) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete(topBarSearchParamKey)
    setSearchParams(nextSearchParams, { replace: true })
  }, [activeConfig, searchParams, setSearchParams])

  const setSearchValue = useCallback((value: string) => {
    if (activeConfig === null) return

    const nextSearchParams = new URLSearchParams(searchParams)
    const normalizedValue = value.trim()

    if (normalizedValue.length === 0) {
      nextSearchParams.delete(topBarSearchParamKey)
    } else {
      nextSearchParams.set(topBarSearchParamKey, value)
    }

    setSearchParams(nextSearchParams, { replace: true })
  }, [activeConfig, searchParams, setSearchParams])

  const registerPageSearch = useCallback((registrationId: string, config: PageTopBarSearchConfig) => {
    setRegistrations((current) => {
      const existing = current.get(registrationId)
      if (existing && arePageTopBarSearchConfigsEqual(existing.config, config)) {
        return current
      }

      const next = new Map(current)
      next.set(
        registrationId,
        existing
          ? {
              ...existing,
              config,
            }
          : {
              config,
              order: nextOrderRef.current++,
            },
      )
      return next
    })
  }, [])

  const unregisterPageSearch = useCallback((registrationId: string) => {
    setRegistrations((current) => {
      if (!current.has(registrationId)) {
        return current
      }

      const next = new Map(current)
      next.delete(registrationId)
      return next
    })
  }, [])

  const mergedSuggestions = useMemo(
    () => mergeSuggestions(activeConfig),
    [activeConfig],
  )

  const contextValue = useMemo<TopBarSearchContextValue>(() => ({
    activeConfig,
    mergedSuggestions,
    searchValue,
    setSearchValue,
    registerPageSearch,
    unregisterPageSearch,
  }), [
    activeConfig,
    mergedSuggestions,
    registerPageSearch,
    searchValue,
    setSearchValue,
    unregisterPageSearch,
  ])

  return (
    <TopBarSearchContext.Provider value={contextValue}>
      {children}
    </TopBarSearchContext.Provider>
  )
}

export const useTopBarSearchValue = () => {
  const context = useTopBarSearchContext()
  const fallbackSearchValue = useUrlSearchValue()

  return {
    searchValue: context?.searchValue || fallbackSearchValue,
    setSearchValue: context?.setSearchValue ?? noopSetSearchValue,
  }
}

export const usePageTopBarSearch = (config: PageTopBarSearchConfig) => {
  const context = useTopBarSearchContext()
  const registrationId = useId()
  const { searchValue, setSearchValue } = useTopBarSearchValue()
  const registerPageSearch = context?.registerPageSearch
  const unregisterPageSearch = context?.unregisterPageSearch
  const suggestionSelectRef = useRef(config.onSuggestionSelect)
  const hasSuggestionSelectHandler = Boolean(config.onSuggestionSelect)

  useLayoutEffect(() => {
    suggestionSelectRef.current = config.onSuggestionSelect
  }, [config.onSuggestionSelect])

  const stableSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    suggestionSelectRef.current?.(suggestion)
  }, [])
  const registeredConfig = useMemo<PageTopBarSearchConfig>(() => ({
    searchKey: config.searchKey,
    enabled: config.enabled,
    placeholder: config.placeholder,
    emptyMessage: config.emptyMessage,
    defaultSuggestions: config.defaultSuggestions,
    suggestions: config.suggestions,
    onSuggestionSelect: hasSuggestionSelectHandler ? stableSuggestionSelect : undefined,
  }), [
    config.defaultSuggestions,
    config.emptyMessage,
    config.enabled,
    config.placeholder,
    config.searchKey,
    config.suggestions,
    hasSuggestionSelectHandler,
    stableSuggestionSelect,
  ])

  useLayoutEffect(() => {
    if (!unregisterPageSearch) return

    return () => {
      unregisterPageSearch(registrationId)
    }
  }, [registrationId, unregisterPageSearch])

  useLayoutEffect(() => {
    if (!registerPageSearch || !unregisterPageSearch) return

    if (registeredConfig.enabled === false) {
      unregisterPageSearch(registrationId)
      return
    }

    registerPageSearch(registrationId, registeredConfig)
  }, [registerPageSearch, registeredConfig, registrationId, unregisterPageSearch])

  return {
    searchValue,
    setSearchValue,
  }
}

export const TopBarSearchContent = () => {
  const context = useTopBarSearchContext()
  const activeConfig = context?.activeConfig ?? null
  const fallbackSearchValue = useUrlSearchValue()

  if (!context || !activeConfig) {
    return null
  }

  const renderedSearchValue = context.searchValue || fallbackSearchValue

  return (
    <div className="min-w-0 flex-1 max-w-xl">
      <SearchCombobox
        value={renderedSearchValue}
        onValueChange={context.setSearchValue}
        placeholder={activeConfig.placeholder}
        suggestions={context.mergedSuggestions}
        onSuggestionSelect={activeConfig.onSuggestionSelect}
        emptyMessage={activeConfig.emptyMessage ?? buildEmptyMessage(activeConfig.placeholder)}
      />
    </div>
  )
}
