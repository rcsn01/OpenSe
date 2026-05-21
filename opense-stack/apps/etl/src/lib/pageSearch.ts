export const topBarSearchParamKey = 'q';

export type SearchSuggestion = {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  keywords?: string[];
  badge?: string;
};

export const normalizePageSearchTerm = (value: string) => value.trim();

const normalizeForMatch = (value: string) => value.toLowerCase().trim();

export const searchText = (value: string | null | undefined, searchTerm: string) => {
  const normalizedSearchTerm = normalizeForMatch(searchTerm);

  if (!normalizedSearchTerm) return true;

  return normalizeForMatch(value ?? '').includes(normalizedSearchTerm);
};

export const searchTextFields = (fields: Array<string | null | undefined>, searchTerm: string) => {
  const normalizedSearchTerm = normalizeForMatch(searchTerm);

  if (!normalizedSearchTerm) return true;

  return fields.some((field) => normalizeForMatch(field ?? '').includes(normalizedSearchTerm));
};

export const fuzzySearchSuggestions = (
  suggestions: SearchSuggestion[],
  searchTerm: string,
  limit = 8,
) => {
  const normalizedSearchTerm = normalizeForMatch(searchTerm);

  if (!normalizedSearchTerm) {
    return suggestions.slice(0, limit);
  }

  return suggestions
    .filter((suggestion) =>
      searchTextFields(
        [
          suggestion.value,
          suggestion.title,
          suggestion.subtitle,
          ...(suggestion.keywords ?? []),
        ],
        normalizedSearchTerm,
      ),
    )
    .slice(0, limit);
};
