import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../Dialog'

const DialogHarness = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Test Dialog</DialogTitle>
      </DialogHeader>
      <input aria-label="First input" />
      <button type="button">Middle action</button>
      <DialogFooter>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

describe('Dialog', () => {
  it('renders when open and closes from close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<DialogHarness open={true} onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<DialogHarness open={true} onClose={onClose} />)

    await user.click(screen.getByTestId('dialog-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<DialogHarness open={true} onClose={onClose} />)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps focus with tab navigation inside dialog', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<DialogHarness open={true} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: 'Close dialog' })
    const firstInput = screen.getByLabelText('First input')
    const middleAction = screen.getByRole('button', { name: 'Middle action' })
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    const saveButton = screen.getByRole('button', { name: 'Save' })

    expect(closeButton).toHaveFocus()

    await user.tab()
    expect(firstInput).toHaveFocus()

    await user.tab()
    expect(middleAction).toHaveFocus()

    await user.tab()
    expect(cancelButton).toHaveFocus()

    await user.tab()
    expect(saveButton).toHaveFocus()

    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(saveButton).toHaveFocus()
  })
})
