import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OpenKbPageShell } from '../OpenKbPageShell'

describe('OpenKbPageShell', () => {
  it('renders tab bars as normal page content with shared page spacing', () => {
    render(
      <OpenKbPageShell>
        <div>Project tabs</div>
        <div>Project content</div>
      </OpenKbPageShell>,
    )

    expect(screen.getByText('Project tabs')).toBeInTheDocument()
    expect(screen.getByText('Project content')).toBeInTheDocument()
  })
})
