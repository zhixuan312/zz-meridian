'use client';

import type { ComponentProps } from 'react';
import { nav, type NavGroup } from '@/app.config';
import { Rail } from '@/components/patterns/rail';
import { CommandPalette } from '@/components/patterns/command-palette';

/**
 * The console's rail and command palette, with the destinations from app.config. They are chosen here, on the client,
 * because a destination carries its icon, a component that cannot cross from the server layout.
 *
 * What depends on the request comes from the product's own layout, as props, so this file never needs editing: the
 * signed-in `user` (or the team's name where there is no sign-in), `signOut` (`null` where there is none), `workspace`
 * and `scopes`, and `only`, the destinations this person may see (admin or member, platform or team), as hrefs.
 */
export function ConsoleRail({ only, ...props }: Omit<ComponentProps<typeof Rail>, 'nav'> & { only?: string[] }) {
  return <Rail nav={visible(only)} {...props} />;
}

export function ConsolePalette({ only }: { only?: string[] }) {
  return <CommandPalette nav={visible(only)} />;
}

/** `nav` narrowed to the hrefs given, with a group left empty dropped; every destination without them. */
export function visible(only?: string[]): NavGroup[] {
  if (!only) return nav;
  return nav.map((g) => ({ ...g, items: g.items.filter((i) => only.includes(i.href)) })).filter((g) => g.items.length);
}
