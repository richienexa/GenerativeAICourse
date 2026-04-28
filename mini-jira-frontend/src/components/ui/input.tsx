import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<'input'>

function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-lg bg-surface-container-lowest px-3 py-1 text-sm text-on-surface placeholder:text-on-surface-variant',
        'ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
