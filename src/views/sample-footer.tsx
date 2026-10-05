import Link from 'next/link';
import { app } from '@/app.config';
import { StatusDot } from '@/components/ui/status-dot';
import { summarise } from '@/components/patterns/status-list/summarise';
import { SERVICES } from '@/data/sample';

/**
 * The sample's footer for the standalone screens: the copyright, the Design Atlas, and the services' state, linking to
 * Health. A product passes its own footer to Standalone, or none.
 */
export function SampleFooter() {
  const status = summarise(SERVICES);
  return (
    <>
      <span>© 2026 {app.name}</span>
      <Link href="/system" className="hit inline-flex hover:text-ink-2">Design system</Link>
      <Link href="/health" className="hit ml-auto inline-flex items-center gap-2 hover:text-ink-2">
        <StatusDot tone={status.status === 'operational' ? 'positive' : status.status === 'degraded' ? 'warning' : 'critical'} />
        {status.text}
      </Link>
    </>
  );
}
