import { useCallback, useEffect, useRef, useState } from 'react'
import { TopBar, type TopBarProps } from './TopBar'
import { SwitchAppPopover } from './SwitchAppPopover'

export interface SwitchAppTopBarProps extends Omit<TopBarProps, 'onMenuClick'> {
  onMenuClick?: () => void
}

export function SwitchAppTopBar({ onMenuClick, ...props }: SwitchAppTopBarProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null)

  const resolveTriggerButton = useCallback(() => {
    const button = wrapperRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Open menu"]')
    setTriggerEl(button ?? null)
    return button ?? null
  }, [])

  const closeMenu = useCallback((options?: { returnFocus?: boolean }) => {
    setIsOpen(false)
    if (options?.returnFocus) {
      triggerEl?.focus()
    }
  }, [triggerEl])

  const handleMenuClick = useCallback(() => {
    resolveTriggerButton()
    setIsOpen((prev) => !prev)
    onMenuClick?.()
  }, [onMenuClick, resolveTriggerButton])

  useEffect(() => {
    resolveTriggerButton()
  }, [resolveTriggerButton])

  useEffect(() => {
    if (!triggerEl) return
    triggerEl.setAttribute('aria-haspopup', 'menu')
    triggerEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
  }, [isOpen, triggerEl])

  return (
    <div ref={wrapperRef} className="relative">
      <TopBar {...props} onMenuClick={handleMenuClick} />
      <SwitchAppPopover open={isOpen} triggerEl={triggerEl} onClose={closeMenu} />
    </div>
  )
}
