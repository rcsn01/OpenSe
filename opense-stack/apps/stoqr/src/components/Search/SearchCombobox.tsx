import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '@repo/ui'
import { Search, X } from 'lucide-react'
import { cn } from '@repo/ui/cn'
import {
  fuzzySearchSuggestions,
  normalizePageSearchTerm,
  type SearchSuggestion,
} from '../../lib/pageSearch'

type SearchComboboxProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  suggestions?: SearchSuggestion[]
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  emptyMessage?: string
  className?: string
  inputClassName?: string
}

export const SearchCombobox = ({
  value,
  onValueChange,
  placeholder,
  suggestions = [],
  onSuggestionSelect,
  emptyMessage = 'No matching results',
  className,
  inputClassName,
}: SearchComboboxProps) => {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const wasFocusedRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const filteredSuggestions = useMemo(
    () => fuzzySearchSuggestions(suggestions, value),
    [suggestions, value],
  )
  const normalizedValue = normalizePageSearchTerm(value)
  const hasSearchValue = value.length > 0
  const shouldShowPanel = isOpen && (filteredSuggestions.length > 0 || normalizedValue.length > 0)

  useEffect(() => {
    setHighlightedIndex(0)
  }, [value, filteredSuggestions.length])

  useEffect(() => {
    if (!wasFocusedRef.current) {
      return
    }

    const input = inputRef.current
    if (!input || document.activeElement === input) {
      return
    }

    input.focus()
    const nextCaretPosition = input.value.length
    input.setSelectionRange(nextCaretPosition, nextCaretPosition)
  }, [value])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const commitSuggestion = (suggestion: SearchSuggestion) => {
    onValueChange(suggestion.value)
    onSuggestionSelect?.(suggestion)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <Input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shouldShowPanel}
        aria-controls={listboxId}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          wasFocusedRef.current = true
          setIsOpen(true)
        }}
        onBlur={() => {
          wasFocusedRef.current = false
        }}
        onChange={(event) => {
          onValueChange(event.target.value)
          setIsOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (value.length > 0) {
              event.preventDefault()
              onValueChange('')
            }
            setIsOpen(false)
            return
          }

          if (!shouldShowPanel) {
            if (event.key === 'ArrowDown' && filteredSuggestions.length > 0) {
              event.preventDefault()
              setIsOpen(true)
            }
            return
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setHighlightedIndex((current) => (current + 1) % filteredSuggestions.length)
            return
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlightedIndex((current) => (current - 1 + filteredSuggestions.length) % filteredSuggestions.length)
            return
          }

          if (event.key === 'Enter' && filteredSuggestions[highlightedIndex]) {
            event.preventDefault()
            commitSuggestion(filteredSuggestions[highlightedIndex])
          }
        }}
        prefix={<Search className="h-4 w-4" />}
        className={cn('rounded-[var(--radius-lg)] pr-10', inputClassName)}
      />

      {hasSearchValue ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onValueChange('')
            setIsOpen(false)
          }}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-none bg-transparent p-0 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {shouldShowPanel ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_20px_45px_rgba(15,23,42,0.14)]"
        >
          {filteredSuggestions.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === index}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 border-none bg-transparent px-4 py-3 text-left transition-colors',
                    highlightedIndex === index
                      ? 'bg-[var(--color-muted)]'
                      : 'hover:bg-[var(--color-muted)]/70',
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSuggestion(suggestion)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--color-foreground)]">
                      {suggestion.title}
                    </div>
                    {suggestion.subtitle ? (
                      <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {suggestion.subtitle}
                      </div>
                    ) : null}
                  </div>
                  {suggestion.badge ? (
                    <span className="shrink-0 rounded-full bg-[var(--color-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                      {suggestion.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
