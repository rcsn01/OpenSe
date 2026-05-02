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