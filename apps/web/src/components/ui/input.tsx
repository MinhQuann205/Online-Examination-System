import * as React from 'react';
import { cn } from '@/lib/utils';
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-focus/25 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
