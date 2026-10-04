'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Copy, Link2, RotateCw, ShieldBan, Terminal } from 'lucide-react';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { KeyValue } from '@/components/ui/key-value';
import { toast } from '@/components/ui/toast';
import { detailHead } from '@/components/patterns/detail-head';
import { cn } from '@/lib/cn';
import { formatCost, formatDuration } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { DEMO_NOW, type RequestRow } from '@/system/fixtures/sample';
import { STATUS_TEXT, statusTone, usageOf, type Span } from '@/system/fixtures/sample-records';
import { formatBytes } from '@/system/sample-cells';
import { domain } from '@/app.config';

const curlOf = (r: RequestRow, body: string | null) =>
  `curl -X ${r.method} https://api.${domain}${r.route} -H "Authorization: Bearer $API_KEY"` + (body ? ` -d '${body.replace(/\s+/g, ' ')}'` : '');

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
    <div className="relative flex flex-1 flex-col">
      <pre className="max-h-96 min-h-0 flex-1 overflow-auto rounded-md border border-line bg-surface-sunk p-4 pr-24 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-ink">{body}</pre>
      <Button
        size="sm"
        variant="ghost"
        icon={<Copy />}
        className="absolute top-2 right-2 bg-surface/80 backdrop-blur-md"
        onClick={() => { void navigator.clipboard?.writeText(body); toast({ tone: 'positive', title: `${label} copied` }); }}
      >
        Copy
      </Button>
    </div>
  );
}

export function RequestView({ request: r, trace, payloads }: { request: RequestRow; trace: Span[]; payloads: { request: string | null; response: string } }) {
  const router = useRouter();
  const usage = usageOf(r);
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
            {failed ? <Button variant="primary" icon={<RotateCw />} onClick={() => toast({ tone: 'positive', title: 'Replay queued', description: `${r.method} ${r.route} will run again${payloads.request ? ' with the same body' : ''}.` })}>Replay</Button> : null}
          </>
        ),
        more: [
          { label: 'Copy request ID', icon: <Copy />, onSelect: () => { void navigator.clipboard?.writeText(r.id); toast({ tone: 'positive', title: 'Request ID copied' }); } },
          { label: 'Copy link', icon: <Link2 />, onSelect: () => { void navigator.clipboard?.writeText(location.href); toast({ tone: 'positive', title: 'Link copied' }); } },
          { label: 'Revoke the key…', icon: <ShieldBan />, tone: 'critical', onSelect: () => router.push('/keys') },
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
                  { label: 'Received', value: <time dateTime={r.at}>{formatDateTime(r.at)}</time> },
                  { label: 'Endpoint', value: <span className="font-mono text-xs" title={`${r.method} ${r.route}`}><span className="text-ink-3">{r.method}</span> {r.route}</span> },
                  { label: 'Latency', value: <span className={r.latency > 1000 ? 'font-medium text-warning-ink' : undefined}>{formatDuration(r.latency)}</span> },
                  { label: 'Response size', value: formatBytes(r.bytes) },
                  { label: 'Customer', value: <Link href={`/requests?q=${encodeURIComponent(r.customer)}`} className="link">{r.customer}</Link> },
                  { label: 'Region', value: r.region, mono: true },
                  { label: 'API key', value: 'Production backend' },
                  ...(r.model
                    ? [
                        { label: 'Model', value: r.model, mono: true },
                        { label: 'Tokens', value: usage.tokens ? <span className="t-num">{usage.tokens.input.toLocaleString('en-US')} in · {usage.tokens.output.toLocaleString('en-US')} out</span> : <span className="text-ink-3">None, refused</span> },
                      ]
                    : []),
                  { label: 'Cost', value: usage.cost ? <span className="t-num">{formatCost(usage.cost)}</span> : <span className="text-ink-3">None, refused</span> },
                ]}
              />
            </CardBody>
            <CardFooter>
              <Link href={`/requests?q=${encodeURIComponent(r.customer)}`} className="row-link inline-flex items-center gap-1 font-medium text-ink">
                More from {r.customer} <ArrowRight className="size-3.5" />
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
        {/* The two payloads side by side: read together, and neither stretched across the whole page. */}
        <Row split="1/2">
          <Card>
            <CardHeader title="Request body" description={`${r.method} ${r.route}`} divided />
            <CardBody className="flex flex-col pt-5">
              {payloads.request ? (
                <Code body={payloads.request} label="Request body" />
              ) : (
                <p className="t-small flex flex-1 items-center justify-center rounded-md border border-dashed border-line px-4 py-10 text-center text-pretty text-ink-3">
                  No body: a {r.method} carries everything it needs in its address.
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Response body" description={`${r.status} ${STATUS_TEXT[r.status] ?? ''}`} divided />
            <CardBody className="flex flex-col pt-5"><Code body={payloads.response} label="Response body" /></CardBody>
          </Card>
        </Row>
      </Stack>
    </PageFrame>
  );
}
