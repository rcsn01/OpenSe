import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Dropdown, DropdownItem } from './Dropdown'

export interface FilterDropdownOption<TValue extends string = string> {
  value: TValue
  label: string
}

export interface FilterDropdownProps<TValue extends string = string> {
  value: TValue
  options: FilterDropdownOption<TValue>[]
  onChange: (value: TValue) => void
  ariaLabel?: string
  className?: string
  menuClassName?: string
}

const toolbarTextButtonClasses =
  'inline-flex h-[26px] items-center gap-1 rounded-[var(--radius-sm)] border-none bg-transparent px-1.5 py-1 text-[var(--type-size-xs)] font-medium leading-none transition-colors duration-[var(--transition-fast)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2'

export function FilterDropdown<TValue extends string = string>({
  value,
  options,
  onChange,
  ariaLabel = 'Stock status filter',
  className,
  menuClassName,
}: FilterDropdownProps<TValue>) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const isActive = Boolean(selectedOption && selectedOption.value !== options[0]?.value)

  if (!selectedOption) return null

  return (
    <Dropdown
      className={cn('min-w-[120px]', menuClassName)}
      trigger={(open) => (
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            toolbarTextButtonClasses,
            isActive
              ? 'font-semibold text-[var(--color-primary)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            className,
          )}
        >
          {selectedOption.label}
          <ChevronDown size={12} />
        </button>
      )}
    >
      {options.map((option) => (
        <DropdownItem key={option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </DropdownItem>
      ))}
    </Dropdown>
  )
}
