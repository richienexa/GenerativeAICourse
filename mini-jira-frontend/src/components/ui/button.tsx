import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-opacity disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'rounded-lg bg-gradient-to-br from-primary to-primary-dim text-on-primary hover:opacity-90',
        secondary:
          'rounded-lg border border-outline-variant/20 bg-transparent text-primary hover:bg-primary/5',
        ghost: 'rounded-lg bg-transparent text-on-surface hover:bg-surface-container',
        destructive: 'rounded-lg bg-error text-on-error hover:opacity-90',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-9 px-4',
        lg: 'h-11 px-6',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}

export { Button, buttonVariants }
