import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost';
  asChild?: boolean;
};
export function Button({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: Props) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        variant === 'default' &&
          'bg-primary text-on-primary hover:bg-primary-hover',
        variant === 'outline' &&
          'border border-line bg-surface text-ink hover:bg-surface-soft',
        variant === 'ghost' && 'text-muted hover:bg-surface-soft',
        className,
      )}
      {...props}
    />
  );
}
