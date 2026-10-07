import { Suspense } from 'react';
import Link from 'next/link';
import { app } from '@/app.config';
import { StatusDot } from '@/components/ui/status-dot';
import { summarise } from '@/components/patterns/status-list/summarise';
import { readServices } from '@/data/metrics';

/**
 * The sample's footer for the standalone screens: the copyright, the Design Atlas, and the services' state, linking to
 * Health. A product passes its own footer to Standalone, or none. The services are read like any page reads them, at
 * request time behind their own boundary, so the screen itself still prerenders; a visitor who may not read them
 * (signed out, on the sign-in page of a product that requires a session) sees the footer without their state.
 */
export function SampleFooter() {
  return (
    <>
      <span>© 2026 {app.name}</span>
      <Link href="/system" className="hit inline-flex hover:text-ink-2">Design system</Link>
      <Suspense fallback={null}>
        <ServicesState />
      </Suspense>
    </>
  );
}

async function ServicesState() {
  const services = await readServices().catch(() => null);
  if (!services) return null;
  const status = summarise(services);
  return (
    <Link href="/health" className="hit ml-auto inline-flex items-center gap-2 hover:text-ink-2">
      <StatusDot tone={status.status === 'operational' ? 'positive' : status.status === 'degraded' ? 'warning' : 'critical'} />
      {status.text}
    </Link>
  );
}
