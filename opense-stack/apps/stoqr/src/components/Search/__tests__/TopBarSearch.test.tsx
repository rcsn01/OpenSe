import { useMemo, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  TopBarSearchContent,
  TopBarSearchProvider,
  usePageTopBarSearch,
  useTopBarSearchValue,
} from '../TopBarSearch'

const SearchTestShell = () => (
  <TopBarSearchProvider>
    <TopBarSearchContent />
    <LocationProbe />
    <Outlet />
  </TopBarSearchProvider>
)

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

const SearchValueProbe = () => {
  const { searchValue } = useTopBarSearchValue()
  return <div data-testid="search-value">{searchValue}</div>
}

const ItemsSearchPage = () => {
  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'items-search',
    placeholder: 'Search items...',
    defaultSuggestions: [
      { id: 'items-default', title: 'Items Home', value: 'items', badge: 'Items' },
    ],
  }), []))

  return (
    <div>
      <SearchValueProbe />
      <Link to="/plain">Go plain</Link>
      <Link to="/alerts">Go alerts</Link>
    </div>
  )
}

const AlertsSearchPage = () => {
  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'alerts-search',
    placeholder: 'Search alerts...',
    defaultSuggestions: [
      { id: 'alerts-default', title: 'Alerts Home', value: 'alerts', badge: 'Alert' },
    ],
  }), []))

  return (
    <div>
      <SearchValueProbe />
      <Link to="/items">Go items</Link>
    </div>
  )
}

const MergeSuggestionsPage = () => {
  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'merge-search',
    placeholder: 'Search merged...',
    defaultSuggestions: [
      { id: 'default-alpha', title: 'Alpha Default', value: 'alpha', badge: 'Default' },
      { id: 'shared-suggestion', title: 'Shared Result', value: 'shared', badge: 'Default' },
    ],
    suggestions: [
      { id: 'shared-suggestion', title: 'Shared Result', value: 'shared', badge: 'Dynamic' },
      { id: 'dynamic-beta', title: 'Beta Dynamic', value: 'beta', badge: 'Dynamic' },
    ],
  }), []))

  return <div>Merge suggestions</div>
}

const ToggleSearchPage = () => {
  const [enabled, setEnabled] = useState(true)

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'toggle-search',
    enabled,
    placeholder: 'Search toggled...',
    defaultSuggestions: [
      { id: 'toggle-default', title: 'Toggle Search', value: 'toggle', badge: 'Toggle' },
    ],
  }), [enabled]))

  return (
    <button type="button" onClick={() => setEnabled((current) => !current)}>
      Toggle search
    </button>
  )
}

const renderSearchRoutes = (initialEntry: string) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route element={<SearchTestShell />}>
        <Route path="/items" element={<ItemsSearchPage />} />
        <Route path="/alerts" element={<AlertsSearchPage />} />
        <Route path="/merge" element={<MergeSuggestionsPage />} />
        <Route path="/toggle" element={<ToggleSearchPage />} />
        <Route path="/plain" element={<div>Plain page</div>} />
      </Route>
    </Routes>
  </MemoryRouter>,
)

describe('TopBarSearchProvider', () => {
  it('registers page-owned search and unregisters it when navigating away', async () => {
    const user = userEvent.setup()
    renderSearchRoutes('/items')

    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Go plain' }))

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/plain')
  })

  it('syncs the active search value into q and clears it on a non-search page', async () => {
    const user = userEvent.setup()
    renderSearchRoutes('/items')

    await user.type(screen.getByRole('combobox', { name: 'Search items...' }), 'wireless')

    expect(screen.getByPlaceholderText('Search items...')).toHaveValue('wireless')
    expect(screen.getByTestId('search-value')).toHaveTextContent('wireless')
    expect(screen.getByTestId('location')).toHaveTextContent('/items?q=wireless')

    await user.click(screen.getByRole('link', { name: 'Go plain' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/plain')
    expect(screen.getByTestId('location')).not.toHaveTextContent('?q=')
  })

  it('supports enabled toggling for a registered page search', async () => {
    const user = userEvent.setup()
    renderSearchRoutes('/toggle')

    expect(screen.getByPlaceholderText('Search toggled...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toggle search' }))

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('merges default and dynamic suggestions in order while deduping duplicate ids', async () => {
    const user = userEvent.setup()
    renderSearchRoutes('/merge')

    await user.click(screen.getByRole('combobox', { name: 'Search merged...' }))

    const options = screen.getAllByRole('option')

    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('Alpha Default')
    expect(options[1]).toHaveTextContent('Shared Result')
    expect(options[2]).toHaveTextContent('Beta Dynamic')
  })

  it('cleans up stale search config when navigating between searchable pages', async () => {
    const user = userEvent.setup()
    renderSearchRoutes('/items')

    await user.click(screen.getByRole('combobox', { name: 'Search items...' }))
    expect(screen.getByText('Items Home')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Go alerts' }))

    expect(screen.getByPlaceholderText('Search alerts...')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Search alerts...' }))
    expect(screen.getByText('Alerts Home')).toBeInTheDocument()
    expect(screen.queryByText('Items Home')).not.toBeInTheDocument()
  })
})
