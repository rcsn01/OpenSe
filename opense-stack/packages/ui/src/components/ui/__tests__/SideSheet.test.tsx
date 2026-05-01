import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CSSProperties } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  SideSheet,
  SideSheetBody,
  SideSheetContent,
  SideSheetDescription,
  SideSheetFooter,
  SideSheetHeader,
  SideSheetTitle,
} from '../SideSheet'

const SideSheetHarness = ({
  open,
  onClose,
  panelStyle,
}: {
  open: boolean
  onClose: () => void
  panelStyle?: CSSProperties
}) => (
  <SideSheet open={open} onClose={onClose} panelStyle={panelStyle}>
    <SideSheetContent>
      <SideSheetHeader>
        <SideSheetTitle>Workspace Settings</SideSheetTitle>
        <SideSheetDescription>Manage collaborators and notifications.</SideSheetDescription>
      </SideSheetHeader>
      <SideSheetBody>
        <div>Body content</div>
      </SideSheetBody>
      <SideSheetFooter>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </SideSheetFooter>
    </SideSheetContent>
  </SideSheet>
)

describe('SideSheet', () => {
  it('renders as a right-aligned page layout', () => {
    render(<SideSheetHarness open={true} onClose={() => {}} />)

    expect(screen.getByRole('dialog')).toHaveClass('translate-x-full')
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    expect(screen.getByText('Body content').parentElement).toHaveClass('flex-1', 'overflow-y-auto')
    expect(screen.getByText('Save').parentElement).toHaveClass('border-t', 'pt-4')
  })

  it('closes from shared dialog affordances', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<SideSheetHarness open={true} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByTestId('dialog-backdrop'))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('forwards custom panel sizing styles to the right sheet dialog', () => {
    render(
      <SideSheetHarness
        open={true}
        onClose={() => {}}
        panelStyle={{ width: 'min(100vw, clamp(64rem, 84vw, 110rem))' }}
      />,
    )

    expect(screen.getByRole('dialog')).toHaveStyle({
      width: 'min(100vw, clamp(64rem, 84vw, 110rem))',
    })
  })
})
