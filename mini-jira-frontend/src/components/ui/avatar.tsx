import { cn, getInitials } from '@/lib/utils'
import type { User } from '@/types'

interface AvatarProps {
  user: User
  size?: 'sm' | 'md'
  className?: string
}

function Avatar({ user, size = 'sm', className }: AvatarProps) {
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <span
      title={user.name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary-container font-semibold text-on-primary-fixed',
        sizeClass,
        className,
      )}
    >
      {getInitials(user.name)}
    </span>
  )
}

interface AvatarGroupProps {
  users: User[]
  max?: number
}

function AvatarGroup({ users, max = 3 }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex -space-x-1.5">
      {visible.map((u) => (
        <Avatar key={u.id} user={u} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-container text-[10px] font-medium text-on-surface-variant ring-1 ring-surface">
          +{overflow}
        </span>
      )}
    </div>
  )
}

export { Avatar, AvatarGroup }
