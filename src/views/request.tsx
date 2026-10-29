'use client';

import { useShareView } from '@/components/base/use-share-view';
import { nothingUsed, requestAddress, requestContext, retryable } from '@/logic/request-context';
import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Copy, KeyRound, Link2, RotateCw, Terminal } from 'lucide-react';
import { PageFrame, Row, Stack } from '@/components/base/shell';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { KeyValue } from '@/components/ui/key-value';
import { toast } from '@/components/ui/toast';
import { AskAbout } from '@/components/patterns/ask-about';
import { detailHead } from '@/components/patterns/detail-head';
import { cn } from '@/lib/cn';
import { formatCost, formatDuration } from '@/lib/format';
import { formatDateTime, formatRelative } from '@/lib/format-date';
import { type RequestRow, STATUS_TEXT, statusTone, usageOf, type Span } from '@/data/sample';
import { formatBytes } from '@/system/sample-cells';
import { domain } from '@/app.config';

/** One shell word, whatever it holds: a body's own `'`, `$(…)` or newline reaches curl as text and runs nothing. */
const shellWord = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
/** A JSON body on one line without touching its values; any other body as it is. */
const oneLine = (body: string) => { try { return JSON.stringify(JSON.parse(body)); } catch { return body; } };

export const curlOf = (r: RequestRow, body: string | null) =>
  `curl -X ${r.method} ${shellWord(`https://api.${domain}${r.route}`)} -H "Authorization: Bearer $API_KEY"` + (body ? ` -d ${shellWord(oneLine(body))}` : '');

const BAR = { accent: 'bg-accent', neutral: 'bg-chart-neutral-strong', critical: 'bg-critical' } as const;

/** Where the time went: one bar per phase on a shared scale from arrival to the last byte. */
function Waterfall({ spans, total }: { spans: Span[]; total: number }) {
  // A request that took no time draws its phases at the start rather than dividing by zero.
  const scale = total || 1;
  return (
    <figure aria-label="Request phases" className="flex flex-col gap-4">
      {spans.map((s, i) => (
        <div key={s.name} className="flex flex-col gap-2">
          <p className="flex min-w-0 items-baseline gap-2 text-sm">
            <span className="shrink-0 font-medium">{s.name}</span>
            <span title={s.detail} className="min-w-0 flex-1 truncate text-xs text-ink-3">{s.detail}</span>
            <span className="t-num shrink-0 text-xs text-ink-2">{formatDuration(s.duration)}</span>
          </p>
          <div className="relative h-1.5 rounded-full bg-fill-track">
            <span
              className={cn('grow-x absolute inset-y-0 rounded-full', BAR[s.tone ?? 'neutral'])}
              style={{ left: `${(s.start / scale) * 100}%`, width: `max(4px, ${(s.duration / scale) * 100}%)`, ['--i' as string]: i }}
            />
          </div>
        </div>
      ))}
      <figcaption className="t-num flex justify-between border-t border-line pt-2.5 text-2xs text-ink-3">
        <span>{formatDuration(0)}</span><span>{formatDuration(total / 2)}</span><span>{formatDuration(total)}</span>
      </figcaption>
      <table className="sr-only">
        <caption>Request phases</caption>
        <tbody>{spans.map((s) => <tr key={s.name}><th>{s.name}</th><td>{s.duration} ms from {s.start} ms</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/**
 * Copy `text`, and say so only once the write resolved. `navigator.clipboard` is absent outside a secure context and
 * `writeText` rejects when the frame is not focused: the toast used to claim a copy either way, on a page whose whole
 * purpose is handing somebody the exact command or id to paste elsewhere.
 */
async function copy(text: string, title: string) {
  try {
    if (!navigator.clipboard) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    toast({ tone: 'positive', title });
  } catch {
    toast({ tone: 'critical', title: 'Not copied', description: 'Your browser did not let the page copy it. Select the text and copy it yourself.' });
  }
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
        onClick={() => { void copy(body, `${label} copied`); }}
      >
        Copy
      </Button>
    </div>
  );
}

/** `replay` is the page's Server Action: it sends the request again and answers with the new request, or why not. */
/** `mayReplay` is what the page asked of the action table, so the control is drawn only for a failed request the person */
/** may replay; anyone else sees no control and nothing that says why. It defaults to the control being available. */
/** `customerHref` is the page of the customer it names, worked out by the page; without one the name is text. */
export function RequestView({ request: r, trace, payloads, routeP95, now, replay, mayReplay = true, customerHref }: { request: RequestRow; trace: Span[]; payloads: { request: string | null; response: string }; /** The route's p95 over the period, for "is this slow?". */ routeP95: number | null; now: string; replay: (id: string) => Promise<{ ok: true; id: string; status: number } | { ok: false; error: string }>; mayReplay?: boolean; customerHref?: string | null }) {
  useShareView(requestContext({ request: r, trace, routeP95, statusText: STATUS_TEXT[r.status] ?? '', payloadChars: { request: payloads.request?.length ?? null, response: payloads.response.length }, now }));
  const router = useRouter();
  const usage = usageOf(r);
  const none = nothingUsed(r);
  const failed = retryable(r);
  const [replaying, startReplay] = useTransition();
  const customer = customerHref ? <Link href={customerHref} className="row-link">{r.customer}</Link> : r.customer;
  const sendAgain = () => startReplay(async () => {
    // A refusal answers with its reason; a replay that never answered (a dropped connection) throws, and is told the same way.
    const result = await replay(r.id).catch(() => ({ ok: false as const, error: 'The replay did not reach the server. Try again.' }));
    if (!result.ok) return toast({ tone: 'critical', title: 'Not replayed', description: result.error });
    router.refresh();
    toast({ tone: 'positive', title: `Replayed: ${result.status} ${STATUS_TEXT[result.status] ?? ''}`.trim(), description: `${r.method} ${r.route} ran again as ${result.id}.`, action: { label: 'Open', onClick: () => router.push(requestAddress(result.id)) } });
  });
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
          customer,
          formatRelative(r.at, new Date(now)),
        ],
        primary: (
          <>
            <Button icon={<Terminal />} onClick={() => { void copy(curlOf(r, payloads.request), 'cURL command copied'); }}>Copy as cURL</Button>
            {failed && mayReplay ? <Button variant="primary" icon={<RotateCw />} busy={replaying} onClick={sendAgain}>Replay</Button> : null}
          </>
        ),
        more: [
          { label: 'Copy request ID', icon: <Copy />, onSelect: () => { void copy(r.id, 'Request ID copied'); } },
          { label: 'Copy link', icon: <Link2 />, onSelect: () => { void copy(location.href, 'Link copied'); } },
          { label: 'Open API keys', icon: <KeyRound />, onSelect: () => router.push('/keys') },
        ],
      })}
    >
      <Stack>
        <Row split="2/3">
          {/* The page's protagonist, marked on a wrapper that is itself the row's first grid item, its card stretched to
              fill it, so the row's two columns are its. */}
          <div data-protagonist="Request" className="flex min-w-0 flex-col *:flex-1">
            <Card>
              <CardHeader
                title="Request"
                description="What arrived, who sent it, and what it cost."
                actions={<AskAbout question={`Why did ${r.method} ${r.route} for ${r.customer} answer ${r.status} in ${formatDuration(r.latency)}?`} />}
                divided
              />
              <CardBody className="pt-1">
                <KeyValue
                  columns={2}
                  items={[
                    { label: 'Received', value: <time dateTime={r.at}>{formatDateTime(r.at)}</time>, title: formatDateTime(r.at) },
                    { label: 'Endpoint', value: <span className="font-mono text-xs"><span className="text-ink-3">{r.method}</span> {r.route}</span>, title: `${r.method} ${r.route}` },
                    { label: 'Latency', value: <span className={r.latency > 1000 ? 'font-medium text-warning-ink' : undefined}>{formatDuration(r.latency)}</span> },
                    { label: 'Response size', value: formatBytes(r.bytes) },
                    { label: 'Customer', value: customerHref ? <Link href={customerHref} className="link">{r.customer}</Link> : r.customer, title: r.customer },
                    { label: 'Region', value: r.region, mono: true },
                    ...(r.replayOf ? [{ label: 'Replay of', value: <Link href={requestAddress(r.replayOf)} className="link font-mono text-xs">{r.replayOf}</Link>, title: r.replayOf }] : []),
                    ...(r.model
                      ? [
                          { label: 'Model', value: r.model, mono: true },
                          { label: 'Tokens', value: usage.tokens ? <span className="t-num">{usage.tokens.input.toLocaleString('en-US')} in · {usage.tokens.output.toLocaleString('en-US')} out</span> : <span className="text-ink-3">{none ?? 'None'}</span>, title: usage.tokens ? `${usage.tokens.input.toLocaleString('en-US')} in · ${usage.tokens.output.toLocaleString('en-US')} out` : undefined },
                        ]
                      : []),
                    { label: 'Cost', value: none ? <span className="text-ink-3">{none}</span> : <span className="t-num">{formatCost(usage.cost)}</span> },
                  ]}
                />
              </CardBody>
              <CardFooter>
                <Link href={`/requests?q=${encodeURIComponent(r.customer)}`} className="row-link inline-flex items-center gap-1 font-medium text-ink hover:text-accent-ink">
                  More from {r.customer} <ArrowRight className="size-3.5" />
                </Link>
              </CardFooter>
            </Card>
          </div>
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
