import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'white'
}

const sizeClasses = {
  sm: 'h-3 w-3 border',
  md: 'h-4 w-4 border-2',
  lg: 'h-6 w-6 border-2'
}

const variantClasses = {
  default: 'border-foreground border-t-transparent',
  white: 'border-white border-t-transparent'
}

export function Spinner({
  className,
  size = 'md',
  variant = 'default'
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  )
}
