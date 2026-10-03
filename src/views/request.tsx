'use client';

import Link from 'next/link';
import { ArrowUpRight, Copy, ExternalLink, RotateCw, ShieldBan, Terminal } from 'lucide-react';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { CopyField } from '@/components/ui/copy-field';
import { KeyValue } from '@/components/ui/key-value';
import { Tabs, Tab, TabList, TabPanel } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { detailHead } from '@/components/patterns/detail-head';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { DEMO_NOW, type RequestRow } from '@/system/fixtures/relay';
import { STATUS_TEXT, statusTone, type Span } from '@/system/fixtures/relay-records';
import { formatBytes, StatusBadge } from '@/views/requests';

const curlOf = (r: RequestRow, body: string) =>
  `curl -X ${r.method} https://api.relay.dev${r.route} -H "Authorization: Bearer $RELAY_KEY"` + (r.method === 'GET' ? '' : ` -d '${body.replace(/\s+/g, ' ')}'`);

const BAR = { accent: 'bg-accent', neutral: 'bg-chart-neutral-strong', critical: 'bg-critical' } as const;

/** Where the time went: one bar per phase on a shared scale from arrival to the last byte. */
function Waterfall({ spans, total }: { spans: Span[]; total: number }) {
  return (
    <figure aria-label="Request phases" className="flex flex-col gap-4">
      {spans.map((s, i) => (
        <div key={s.name} className="flex flex-col gap-2">
          <p className="flex min-w-0 items-baseline gap-2 text-sm">
            <span className="shrink-0 font-medium">{s.name}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{s.detail}</span>
            <span className="t-num shrink-0 text-xs text-ink-2">{formatDuration(s.duration)}</span>
          </p>
          <div className="relative h-1.5 rounded-full bg-fill-track">
            <span
              className={cn('grow-x absolute inset-y-0 rounded-full', BAR[s.tone ?? 'neutral'])}
              style={{ left: `${(s.start / total) * 100}%`, width: `max(4px, ${(s.duration / total) * 100}%)`, ['--i' as string]: i }}
            />
          </div>
        </div>
      ))}
      <figcaption className="t-num flex justify-between border-t border-line pt-2.5 text-2xs text-ink-3">
        <span>0 ms</span><span>{formatDuration(total / 2)}</span><span>{formatDuration(total)}</span>
      </figcaption>
      <table className="sr-only">
        <caption>Request phases</caption>
        <tbody>{spans.map((s) => <tr key={s.name}><th>{s.name}</th><td>{s.duration} ms from {s.start} ms</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function Code({ body, label }: { body: string; label: string }) {
  return (
    <div className="relative">
      <pre className="max-h-96 overflow-auto rounded-md border border-line bg-surface-sunk p-4 font-mono text-xs leading-relaxed text-ink">{body}</pre>
      <Button
        size="sm"
        variant="ghost"
        icon={<Copy />}
        className="absolute top-2 right-2 bg-surface/80 backdrop-blur"
        onClick={() => { void navigator.clipboard?.writeText(body); toast({ tone: 'positive', title: `${label} copied` }); }}
      >
        Copy
      </Button>
    </div>
  );
}

export function RequestView({ request: r, trace, payloads }: { request: RequestRow; trace: Span[]; payloads: { request: string; response: string } }) {
  const failed = r.status >= 500 || r.status === 429;
  return (
    <PageFrame
      {...detailHead({
        parent: { label: 'Requests', href: '/requests' },
        name: r.id,
        mono: true,
        status: { tone: statusTone(r.status), label: `${r.status} ${STATUS_TEXT[r.status] ?? ''}` },
        facts: [
          <span key="r" className="font-mono text-[0.9em] text-ink">{r.method} {r.route}</span>,
          formatDuration(r.latency),
          r.customer,
          formatRelative(r.at, DEMO_NOW),
        ],
        primary: (
          <>
            <Button icon={<Terminal />} onClick={() => { void navigator.clipboard?.writeText(curlOf(r, payloads.request)); toast({ tone: 'positive', title: 'cURL command copied' }); }}>Copy as cURL</Button>
            {failed ? <Button variant="primary" icon={<RotateCw />} onClick={() => toast({ tone: 'positive', title: 'Replay queued', description: `${r.method} ${r.route} will run again with the same body.` })}>Replay</Button> : null}
          </>
        ),
        more: [
          { label: 'Copy request ID', icon: <Copy />, onSelect: () => { void navigator.clipboard?.writeText(r.id); toast({ tone: 'positive', title: 'Request ID copied' }); } },
          { label: 'Open in logs', icon: <ExternalLink />, onSelect: () => toast({ tone: 'neutral', title: 'Logs open in a new tab' }) },
          { label: 'Block this key', icon: <ShieldBan />, tone: 'critical', onSelect: () => toast({ tone: 'neutral', title: 'Blocking a key opens API keys', description: 'Keys are revoked from their own page, with a confirmation.' }) },
        ],
      })}
    >
      <Stack>
        <Row split="2/3">
          <Card>
            <CardHeader title="Request" description="What arrived, who sent it, and what it cost." divided />
            <CardBody className="pt-1">
              <KeyValue
                columns={2}
                items={[
                  { label: 'Request ID', value: <CopyField value={r.id} label="Request ID" className="w-full" /> },
                  { label: 'Received', value: <time dateTime={r.at}>{formatDateTime(r.at)}</time> },
                  { label: 'Endpoint', value: <span className="font-mono text-xs" title={`${r.method} ${r.route}`}><span className="text-ink-3">{r.method}</span> {r.route}</span> },
                  { label: 'Status', value: <StatusBadge status={r.status} /> },
                  { label: 'Latency', value: <span className={r.latency > 1000 ? 'font-medium text-warning-ink' : undefined}>{formatDuration(r.latency)}</span> },
                  { label: 'Response size', value: formatBytes(r.bytes) },
                  { label: 'Customer', value: <Link href={`/requests?q=${encodeURIComponent(r.customer)}`} className="link">{r.customer}</Link> },
                  { label: 'Region', value: r.region, mono: true },
                  { label: 'Model', value: r.model, mono: true },
                  { label: 'API key', value: 'Production backend' },
                ]}
              />
            </CardBody>
            <CardFooter>
              <Link href={`/requests?q=${encodeURIComponent(r.customer)}`} className="row-link inline-flex items-center gap-1 font-medium text-ink">
                More from {r.customer} <ArrowUpRight className="size-3.5" />
              </Link>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader title="Trace" description={`${trace.length} phases, ${formatDuration(r.latency)} end to end`} divided />
            <CardBody className="pt-5">
              <Waterfall spans={trace} total={r.latency} />
            </CardBody>
          </Card>
        </Row>
        <Card>
          <Tabs defaultValue="request">
            <div className="flex items-center gap-4 px-(--card-pad) pt-3">
              <TabList aria-label="Payload">
                <Tab value="request">Request body</Tab>
                <Tab value="response">Response body</Tab>
              </TabList>
            </div>
            <TabPanel value="request" className="px-(--card-pad) pt-4 pb-(--card-pad)"><Code body={payloads.request} label="Request body" /></TabPanel>
            <TabPanel value="response" className="px-(--card-pad) pt-4 pb-(--card-pad)"><Code body={payloads.response} label="Response body" /></TabPanel>
          </Tabs>
        </Card>
      </Stack>
    </PageFrame>
  );
}
