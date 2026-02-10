import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

/* ── Checkbox ─────────────────────────────────────────── */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id: idProp, ...props }, ref) => {
    const autoId = useId()
    const id = idProp ?? autoId
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={cn(
            'h-4 w-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] accent-[var(--color-primary)] transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        {label && (
          <label htmlFor={id} className="text-sm cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    )
  },
)
Checkbox.displayName = 'Checkbox'

/* ── Radio ────────────────────────────────────────────── */

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id: idProp, ...props }, ref) => {
    const autoId = useId()
    const id = idProp ?? autoId
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="radio"
          id={id}
          className={cn(
            'h-4 w-4 border border-[var(--color-border)] accent-[var(--color-primary)] transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        {label && (
          <label htmlFor={id} className="text-sm cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    )
  },
)
Radio.displayName = 'Radio'

/* ── Toggle / Switch ──────────────────────────────────── */

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id: idProp, checked, onChange, disabled, ...props }, ref) => {
    const autoId = useId()
    const id = idProp ?? autoId
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={!!checked}
          disabled={disabled}
          onClick={() => {
            if (onChange && !disabled) {
              const syntheticEvent = { target: { checked: !checked } } as React.ChangeEvent<HTMLInputElement>
              onChange(syntheticEvent)
            }
          }}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-[var(--transition-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
            className,
          )}
        >
          <span
            className={cn(
              'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform duration-[var(--transition-fast)]',
              checked ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
        <input ref={ref} type="checkbox" id={id} className="sr-only" checked={checked} onChange={onChange} {...props} />
        {label && (
          <label htmlFor={id} className="text-sm cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    )
  },
)
Toggle.displayName = 'Toggle'
