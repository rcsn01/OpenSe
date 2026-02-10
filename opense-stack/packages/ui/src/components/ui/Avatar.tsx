import { cn } from '../../lib/cn'
import { cva, type VariantProps } from 'class-variance-authority'

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-muted)] font-medium text-[var(--color-muted-foreground)]',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string; alt?: string; fallback?: string; className?: string
}

export function Avatar({ src, alt, fallback, size, className }: AvatarProps) {
  const initials = fallback || alt?.charAt(0)?.toUpperCase() || '?'
  return (
    <span className={cn(avatarVariants({ size }), className)}>
      {src ? <img src={src} alt={alt ?? ''} className="h-full w-full object-cover" /> : <span>{initials}</span>}
    </span>
  )
}

export function AvatarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex -space-x-2', className)}>{children}</div>
}
