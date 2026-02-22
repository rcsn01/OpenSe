import { type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

/* ── Heading ──────────────────────────────────────────── */

const HEADING_COLOR = { color: 'var(--shade-black-3)' }

const headingVariants = cva('tracking-tight', {
  variants: {
    level: {
      h1: 'text-4xl leading-tight md:text-5xl',
      h2: 'text-3xl leading-snug md:text-4xl',
      h3: 'text-2xl leading-snug md:text-3xl',
      h4: 'text-xl leading-normal md:text-2xl',
      h5: 'text-lg leading-normal md:text-xl',
      h6: 'text-base leading-normal md:text-lg',
    },
  },
  defaultVariants: { level: 'h1' },
})

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

interface HeadingProps extends VariantProps<typeof headingVariants> {
  level?: HeadingLevel
  children: ReactNode
  className?: string
}

export function Heading({ level = 'h1', children, className }: HeadingProps) {
  const Tag = level
  return (
    <Tag style={HEADING_COLOR} className={cn(headingVariants({ level }), className)}>
      {children}
    </Tag>
  )
}

/* ── Body text ────────────────────────────────────────── */

const BODY_COLOR = { color: 'var(--shade-black-7)' }

const bodyVariants = cva('', {
  variants: {
    size: {
      body1: 'text-xl leading-relaxed',
      body2: 'text-lg leading-relaxed',
      body3: 'text-base leading-relaxed',
      body4: 'text-sm leading-normal',
      body5: 'text-xs leading-normal',
      body6: 'text-[0.625rem] leading-normal',
    },
    muted: { true: '', false: '' },
  },
  defaultVariants: { size: 'body3', muted: false },
})

type BodySize = 'body1' | 'body2' | 'body3' | 'body4' | 'body5' | 'body6'

interface BodyProps extends VariantProps<typeof bodyVariants> {
  size?: BodySize
  muted?: boolean
  children: ReactNode
  className?: string
  as?: 'p' | 'span' | 'div'
}

export function Body({ size = 'body3', muted = false, children, className, as: Tag = 'p' }: BodyProps) {
  const colorStyle = muted ? { color: 'var(--color-muted-foreground)' } : BODY_COLOR
  return (
    <Tag style={colorStyle} className={cn(bodyVariants({ size, muted }), className)}>
      {children}
    </Tag>
  )
}

/* ── Label ────────────────────────────────────────────── */

interface LabelProps {
  children: ReactNode
  htmlFor?: string
  className?: string
  required?: boolean
}

export function Label({ children, htmlFor, className, required }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn('text-sm text-[var(--color-foreground)]', className)}>
      {children}
      {required && <span className="ml-0.5 text-[var(--color-destructive)]">*</span>}
    </label>
  )
}

/* ── Code / Mono ──────────────────────────────────────── */

interface CodeProps {
  children: ReactNode
  className?: string
  block?: boolean
}

export function Code({ children, className, block = false }: CodeProps) {
  if (block) {
    return (
      <pre className={cn('overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--color-muted)] p-4 text-sm leading-relaxed', className)}>
        <code>{children}</code>
      </pre>
    )
  }
  return (
    <code className={cn('rounded-[var(--radius-sm)] bg-[var(--color-muted)] px-1.5 py-0.5 text-sm font-mono', className)}>
      {children}
    </code>
  )
}
