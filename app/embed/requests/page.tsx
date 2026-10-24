import { Suspense } from 'react';
import { requestsTool } from '@/logic/tools';
import { EmbedBusy, EmbedFailed } from '@/components/patterns/embed-frame';
import { EmbedRequests } from './view';

export const metadata = { title: 'Requests' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Tool: `zz_meridian_requests { status?, method?, region?, q? }` (`requestsTool` in `src/logic/tools.ts`). The arguments are the console's filter names, so the
 * tool's view and the console's view are the same address. Inline: the five latest that match. Fullscreen: the table.
 * Both read what the console page reads: one page of the filtered set and the summary of all of it, so the shared
 * context is the console's.
 *
 * The frame is drawn at once with the view's own name; the scope its title gains ("Requests · Failing") is the read's
 * to say, and the console link carries the filters once it has: the unfiltered list is where the reader lands meanwhile.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Busy />}>
      <Requests searchParams={searchParams} />
    </Suspense>
  );
}

/** The frame the host sees while the read runs: this view's title, and a body of the shape the read will fill. */
function Busy() {
  return (
    <EmbedBusy title="Requests" consolePath="/requests" name="Requests" blocks={['table']} />
  );
}

async function Requests({ searchParams }: { searchParams: SearchParams }) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  // The tool's own read: the address's filters are its arguments, and the sort and page the table may set ride along.
  // A read that threw is this view's own failure, drawn in the frame. The segment's error boundary is the last net
  // under it, and imports nothing, because anything a boundary imports lands in every embed's first load.
  const read = await requestsTool.read({ status: one(p.status) as 'all' | undefined, method: one(p.method), region: one(p.region), q: one(p.q), ...(p.sort || p.dir || p.page ? { sort: one(p.sort), dir: one(p.dir), page: one(p.page) } : {}) } as Parameters<typeof requestsTool.read>[0]).catch(() => null);
  return read ? <EmbedRequests {...read.data} /> : <EmbedFailed title="Requests" consolePath="/requests" name="Requests" />;
}
