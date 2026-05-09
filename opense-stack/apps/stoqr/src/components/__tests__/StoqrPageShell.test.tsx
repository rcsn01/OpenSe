import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../Search/TopBarSearch'
import { StoqrPageShell } from '../StoqrPageShell'

const renderShell = () => render(
  <MemoryRouter>
    <TopBarSearchProvider>
      <TopBarSearchContent />
      <StoqrPageShell
        companyId="company-1"
        search={{
          searchKey: 'shell-test',
          placeholder: 'Search shell...',
          defaultSuggestions: [
            {
              id: 'shell-default',
              title: 'Shell Result',
              value: 'shell',
              badge: 'Test',
            },
          ],
        }}
      >
        <div>Shell content</div>
      </StoqrPageShell>
    </TopBarSearchProvider>
  </MemoryRouter>,
)

describe('StoqrPageShell', () => {
  it('registers page search config and renders children through the page shell', async () => {
    const user = userEvent.setup()

    renderShell()

    expect(screen.getByText('Shell content')).toBeInTheDocument()
    const search = screen.getByRole('combobox', { name: 'Search shell...' })
    expect(search).toBeInTheDocument()

    await user.click(search)
    expect(screen.getByRole('option', { name: /Shell Result/i })).toBeInTheDocument()
  })

  it('uses the shared company empty state when no company is selected', () => {
    render(
      <MemoryRouter>
        <TopBarSearchProvider>
          <StoqrPageShell
            companyId={null}
            emptyStateTitle="No org"
            emptyStateDescription="Pick an org."
          >
            <div>Hidden content</div>
          </StoqrPageShell>
        </TopBarSearchProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('No org')).toBeInTheDocument()
    expect(screen.getByText('Pick an org.')).toBeInTheDocument()
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })
})
