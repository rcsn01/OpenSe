import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrganisationTeamsShell } from '../OrganisationTeamsShell'

describe('OrganisationTeamsShell', () => {
  it('renders toolbar and primary content', () => {
    render(
      <OrganisationTeamsShell
        toolbar={<div>Toolbar content</div>}
        primaryContent={<div>Primary content</div>}
      />,
    )

    expect(screen.getByText('Toolbar content')).toBeInTheDocument()
    expect(screen.getByText('Primary content')).toBeInTheDocument()
  })

  it('renders secondary content when provided', () => {
    render(
      <OrganisationTeamsShell
        primaryContent={<div>Primary content</div>}
        secondaryContent={<div>Secondary content</div>}
      />,
    )

    expect(screen.getByText('Primary content')).toBeInTheDocument()
    expect(screen.getByText('Secondary content')).toBeInTheDocument()
  })
})
