import { cn } from '@/lib/cn'

interface LogoProps {
  compact?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const WORD_SIZES = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
} as const

const MARK_SIZES = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-7',
} as const

export function Logo({ compact = false, size = 'md', className }: LogoProps) {
  const markHeight = compact ? 'h-5' : MARK_SIZES[size]
  const wordHeight = compact ? 'h-8' : WORD_SIZES[size]

  return (
    <span dir="ltr" className={cn('inline-flex items-center gap-1', className)}>
      <img
        src="/mydoc-mark.png"
        alt=""
        className={cn('w-auto shrink-0 rounded-sm object-contain', markHeight)}
      />
      {!compact && (
        <img
          src="/mydoc-logo.png"
          alt="mydoc"
          className={cn('w-auto object-contain invert', wordHeight)}
        />
      )}
    </span>
  )
}
