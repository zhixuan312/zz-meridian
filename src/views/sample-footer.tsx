import { Suspense } from 'react';
import Link from 'next/link';
import { app, nav } from '@/app.config';
import { StatusDot } from '@/components/ui/status-dot';
import type { Service } from '@/components/patterns/status-list';
import { summarise } from '@/logic/summarise';

/**
 * The sample's footer for the standalone screens: the copyright, the Design Atlas while the navigation has it, and the
 * services' state, linking to Services. A product passes its own footer to Standalone, or none. The services are read by the screen that owns the
 * read, which hands this footer a thunk; the footer calls it inside its own boundary, at request time, so the screen
 * itself still prerenders and a visitor who may not read them (signed out, on the sign-in page of a product that
 * requires a session) sees the footer without their state.
 */
/** The Atlas's entry in the navigation: brand.ts --no-atlas takes it out, and the footer's link goes with it. */
const atlas = nav.flatMap((g) => g.items).find((i) => i.href === '/system');

export function SampleFooter({ services }: { services: () => Promise<Service[] | null> }) {
  return (
    <>
      <span>© 2026 {app.name}</span>
      {atlas && <Link href={atlas.href} className="hit inline-flex hover:text-ink-2">{atlas.label}</Link>}
      <Suspense fallback={null}>
        <ServicesState services={services} />
      </Suspense>
    </>
  );
}

async function ServicesState({ services }: { services: () => Promise<Service[] | null> }) {
  const list = await services();
  if (!list) return null;
  const status = summarise(list);
  return (
    <Link href="/services" className="hit ml-auto inline-flex items-center gap-2 hover:text-ink-2">
      <StatusDot tone={status.status === 'operational' ? 'positive' : status.status === 'degraded' ? 'warning' : 'critical'} />
      {status.text}
    </Link>
  );
}
