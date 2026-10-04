import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** The team's own button, the way a shadcn project has one: Meridian's must never resolve to it. */
export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('rounded-md bg-black px-3 py-2 text-white', className)} {...props} />;
}
