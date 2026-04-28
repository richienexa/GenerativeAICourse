import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>

function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
