import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ── Input ────────────────────────────────────────────── */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  error?: string
  /** Icon or element rendered inside the input on the left (ETL compat) */
  prefix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, prefix, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className={cn('relative', prefix && 'flex items-center')}>
          {prefix && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[var(--color-muted-foreground)]">
              {prefix}
            </div>
          )}
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
              prefix && 'pl-9',
              className,
            )}
            {...props}
          />
        </div>
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
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, options, placeholder, error, ...props }, ref) => {
    return (
      <div className={cn('w-full', containerClassName)}>
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'flex h-9 w-full rounded-[var(--radius-md)] border-0 bg-transparent py-1.5 pl-3 pr-8 text-sm transition-colors duration-[var(--transition-fast)] appearance-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'focus-visible:ring-[var(--color-destructive)]',
              className,
            )}
            {...(props as SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {placeholder && (
              <option value="" disabled>{placeholder}</option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            aria-hidden="true"
          />
        </div>
        {error && <p className="mt-1 text-xs text-[var(--color-destructive)]">{error}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'
