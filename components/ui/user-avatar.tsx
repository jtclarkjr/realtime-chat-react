'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  src?: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  show?: boolean
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
  xl: 'size-12'
}

const getUserIcon = (size: 'sm' | 'md' | 'lg' | 'xl') => {
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  }
  return <User className={iconSizes[size]} />
}

export const UserAvatar = ({
  src,
  alt,
  size = 'md',
  className,
  show = true
}: UserAvatarProps) => {
  // Don't render anything if show is false
  if (!show) {
    return null
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={src || undefined} alt={alt} />
      <AvatarFallback className="bg-muted text-muted-foreground">
        {getUserIcon(size)}
      </AvatarFallback>
    </Avatar>
  )
}
