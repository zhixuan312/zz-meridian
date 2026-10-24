import { Suspense } from 'react';
import { ShellTools } from '@/components/patterns/shell-tools';
import type { AlertsRead } from '@/logic/alerts';
import { DEMO_NOW } from '@/data/sample';

/** The tools with no alert: what the bell shows while the alerts are read, and for a person who may not be told any. */
function QuietTools() {
  return <ShellTools alerts={[]} now={DEMO_NOW} />;
}

async function ToolsWithAlerts({ alerts }: { alerts: Promise<AlertsRead | null> }) {
  const told = await alerts;
  return told ? <ShellTools alerts={told.alerts} now={new Date(told.now)} /> : <QuietTools />;
}

/**
 * The shell's tools with the product's alerts. The layout hands over the read's promise unawaited, settled on null when
 * the read is refused or fails, and it is resolved here behind a boundary of its own, so the frame never waits for it:
 * until it settles the tools are drawn with no alert, and null leaves them that way.
 */
export function ShellAlerts({ alerts }: { alerts: Promise<AlertsRead | null> }) {
  return (
    <Suspense fallback={<QuietTools />}>
      <ToolsWithAlerts alerts={alerts} />
    </Suspense>
  );
}
