import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/cn'

/* ── Input ────────────────────────────────────────────── */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-[var(--radius-md)] border bg-transparent px-3 py-1.5 text-sm transition-colors duration-[var(--transition-fast)]',
            'placeholder:text-[var(--color-muted-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--color-destructive)]">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

/* ── Textarea ─────────────────────────────────────────── */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[5rem] w-full rounded-[var(--radius-md)] border bg-transparent px-3 py-2 text-sm transition-colors duration-[var(--transition-fast)]',
            'placeholder:text-[var(--color-muted-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--color-destructive)]">{error}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

/* ── Select ───────────────────────────────────────────── */

export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-[var(--radius-md)] border bg-transparent px-3 py-1.5 text-sm transition-colors duration-[var(--transition-fast)] appearance-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-[var(--color-destructive)] focus-visible:ring-[var(--color-destructive)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
            className,
          )}
          {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-[var(--color-destructive)]">{error}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'
