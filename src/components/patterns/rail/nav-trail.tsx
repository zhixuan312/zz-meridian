'use client';

import { usePathname } from 'next/navigation';
import { nav } from '@/app.config';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { entryFor, navTrail } from './trail';

/**
 * A sub page's masthead trail, for its kicker: the entry the address falls under, read with the rail's own rule, and its
 * parent. The page names no href of its own, so a route that moves keeps a true trail. A page with no parent draws none.
 * It reads `nav` itself: a page is a server component, and the navigation's icons cannot be handed to a client one.
 */
export function NavTrail() {
  const entry = entryFor(usePathname() ?? '', nav.flatMap((g) => g.items));
  const crumbs = entry ? navTrail(entry.href, nav) : [];
  return crumbs.length > 1 ? <Breadcrumb items={crumbs} /> : null;
}
