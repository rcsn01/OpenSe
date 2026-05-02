import { matchSorter, rankings } from 'match-sorter'

export const topBarSearchParamKey = 'q'

type MatchSorterOptions<Item> = NonNullable<Parameters<typeof matchSorter<Item>>[2]>

export type FuzzySearchKey<Item> = NonNullable<MatchSorterOptions<Item>['keys']>[number]

export const normalizePageSearchTerm = (value: string) => value.trim()

export const fuzzySearchItems = <Item>(items: Item[], searchTerm: string, keys: FuzzySearchKey<Item>[]) => {
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)

  if (normalizedSearchTerm.length === 0) {
    return items
  }

  const searchTokens = normalizedSearchTerm.split(/\s+/).filter(Boolean)

  return searchTokens.reduce((matchedItems, token) => matchSorter(matchedItems, token, {
    keys,
    threshold: rankings.CONTAINS,
  }), items)
}

export const fuzzyRankings = rankings

export type SearchSuggestion = {
  id: string
  title: string
  value: string
  subtitle?: string
  keywords?: string[]
  badge?: string
}

export const fuzzySearchSuggestions = (
  suggestions: SearchSuggestion[],
  searchTerm: string,
  limit = 8,
) => {
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)

  if (normalizedSearchTerm.length === 0) {
    return suggestions.slice(0, limit)
  }

  return matchSorter(suggestions, normalizedSearchTerm, {
    keys: [
      {
        key: (suggestion) => suggestion.value,
        maxRanking: rankings.STARTS_WITH,
      },
      {
        key: (suggestion) => suggestion.title,
        maxRanking: rankings.WORD_STARTS_WITH,
      },
      {
        key: (suggestion) => suggestion.subtitle ?? '',
        maxRanking: rankings.CONTAINS,
      },
      {
        key: (suggestion) => suggestion.keywords ?? [],
        maxRanking: rankings.CONTAINS,
      },
    ],
    threshold: rankings.CONTAINS,
  }).slice(0, limit)
}
