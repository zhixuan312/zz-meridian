'use client';

import { nav } from '@/app.config';
import { Rail } from '@/components/patterns/rail';
import { CommandPalette } from '@/components/patterns/command-palette';

/**
 * The console's rail and command palette, with the destinations from app.config. They are chosen here, on the client,
 * because a destination carries its icon, a component that cannot cross from the server layout. A product whose
 * destinations depend on the person (admin or member, platform or team) filters `nav` here, from its session.
 */
export function ConsoleRail() {
  return <Rail nav={nav} />;
}

export function ConsolePalette() {
  return <CommandPalette nav={nav} />;
}
