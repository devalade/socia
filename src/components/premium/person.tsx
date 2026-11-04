import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Truncate } from '@/components/premium/truncate'
import { hue, initials } from '@/lib/format'

// A person as a 24px avatar and a name. Initials work for every script (two letters for Latin, one
// character for CJK and Arabic); the colour is stable per name. No name is a role, never a blank:
// "Guest checkout", "Deleted user".

type PersonProps = {
  name: string | null | undefined
  image?: string
  /** Shown when there is no name. */
  fallback?: string
  detail?: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export function PersonAvatar({ name, image, size = 'sm', className }: Pick<PersonProps, 'name' | 'image' | 'size' | 'className'>) {
  const h = hue(name)
  return (
    <Avatar className={cn(size === 'sm' ? 'size-6' : 'size-8', className)}>
      {image && <AvatarImage src={image} alt="" />}
      <AvatarFallback
        className={cn('font-semibold', size === 'sm' ? 'text-[10px]' : 'text-xs', !name && 'bg-muted text-muted-foreground ring-1 ring-border ring-inset')}
        style={name ? { background: `oklch(0.92 0.045 ${h})`, color: `oklch(0.38 0.09 ${h})` } : undefined}
      >
        {name ? initials(name) : <UserRound className="size-3.5" />}
      </AvatarFallback>
    </Avatar>
  )
}

export function Person({ name, image, fallback = 'Guest', detail, size = 'sm', className }: PersonProps) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <PersonAvatar name={name} image={image} size={size} />
      <span className="grid min-w-0">
        {name ? <Truncate bdi>{name}</Truncate> : <Truncate className="text-muted-foreground">{fallback}</Truncate>}
        {detail && <Truncate className="text-xs text-muted-foreground">{detail}</Truncate>}
      </span>
    </span>
  )
}
