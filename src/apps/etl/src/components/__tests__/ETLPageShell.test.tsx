import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { APP_PAGE_SHELL_CONTENT_CLASS_NAME } from '@repo/ui'
import { ETLPageShell } from '../ETLPageShell'
import { TopBarSearchContent, TopBarSearchProvider } from '../Search/TopBarSearch'

const renderShell = () => render(
  <MemoryRouter>
    <TopBarSearchProvider>
      <TopBarSearchContent />
      <ETLPageShell
        search={{
          searchKey: 'etl-shell-test',
          placeholder: 'Search ETL...',
          defaultSuggestions: [
            {
              id: 'etl-default',
              title: 'ETL Result',
              value: 'etl',
              badge: 'Test',
            },
          ],
        }}
      >
        <div>ETL shell content</div>
      </ETLPageShell>
    </TopBarSearchProvider>
  </MemoryRouter>,
)

describe('ETLPageShell', () => {
  it('registers page search config and renders through shared shell defaults', async () => {
    const user = userEvent.setup()

    const { container } = renderShell()

    expect(container.querySelector('.app-page-shell')).toHaveClass(
      ...APP_PAGE_SHELL_CONTENT_CLASS_NAME.split(' '),
    )
    expect(screen.getByText('ETL shell content')).toBeInTheDocument()

    const search = screen.getByRole('combobox', { name: 'Search ETL...' })
    await user.click(search)
    expect(screen.getByRole('option', { name: /ETL Result/i })).toBeInTheDocument()
  })
})
