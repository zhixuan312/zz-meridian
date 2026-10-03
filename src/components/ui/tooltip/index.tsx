'use client';

import { Tooltip as T } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A short explanation under the pointer or on keyboard focus. Never holds an action, never the only place a fact lives. */
export function Tooltip({ content, side = 'top', children, className }: { content: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactNode; className?: string }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn('float-in z-(--layer-tooltip) max-w-64 rounded-sm bg-surface-inverse px-2 py-1.5 text-xs leading-snug text-ink-inverse shadow-overlay', className)}
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
