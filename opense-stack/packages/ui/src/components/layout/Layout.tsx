import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ── Container ────────────────────────────────────────── */

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-screen-sm', md: 'max-w-screen-md', lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl', '2xl': 'max-w-screen-2xl', full: 'max-w-full',
}

export function Container({ children, className, size, maxWidth }: ContainerProps) {
  const key = size ?? maxWidth ?? 'xl'
  return <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[key], className)}>{children}</div>
}

/* ── Gap helper ───────────────────────────────────────── */

const gapClasses: Record<number, string> = {
  1: 'gap-[var(--gap-1)]', 2: 'gap-[var(--gap-2)]', 3: 'gap-[var(--gap-3)]',
  4: 'gap-[var(--gap-4)]', 5: 'gap-[var(--gap-5)]', 6: 'gap-[var(--gap-6)]',
}

const alignClasses: Record<string, string> = {
  start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch',
}

const justifyClasses: Record<string, string> = {
  start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around',
}

/* ── VStack ───────────────────────────────────────────── */

interface StackProps {
  children: ReactNode; className?: string
  gap?: 1 | 2 | 3 | 4 | 5 | 6; align?: 'start' | 'center' | 'end' | 'stretch'
}

export function VStack({ children, className, gap = 4, align = 'stretch' }: StackProps) {
  return <div className={cn('flex flex-col', gapClasses[gap], alignClasses[align], className)}>{children}</div>
}

/* ── HStack ───────────────────────────────────────────── */

interface HStackProps extends StackProps {
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'; wrap?: boolean
}

export function HStack({ children, className, gap = 4, align = 'center', justify = 'start', wrap = false }: HStackProps) {
  return (
    <div className={cn('flex flex-row', gapClasses[gap], alignClasses[align], justifyClasses[justify ?? 'start'], wrap && 'flex-wrap', className)}>
      {children}
    </div>
  )
}

/* ── Grid ─────────────────────────────────────────────── */

interface GridProps { children: ReactNode; className?: string; cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12; gap?: 1 | 2 | 3 | 4 | 5 | 6 }

const colClasses: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
  5: 'grid-cols-5', 6: 'grid-cols-6', 12: 'grid-cols-12',
}

export function Grid({ children, className, cols = 3, gap = 4 }: GridProps) {
  return <div className={cn('grid', colClasses[cols], gapClasses[gap], className)}>{children}</div>
}
