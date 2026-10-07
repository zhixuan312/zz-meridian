import { Suspense } from 'react';
import { requestsTool } from '@/views/tools';
import { EmbedRequests } from './view';

export const metadata = { title: 'Requests' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Tool: `zz_meridian_requests { status?, method?, region?, q? }` (`requestsTool` in `src/views/tools.ts`). The arguments are the console's filter names, so the
 * tool's view and the console's view are the same address. Inline: the five latest that match. Fullscreen: the table.
 * Both read what the console page reads: one page of the filtered set and the summary of all of it, so the shared
 * context is the console's.
 */
export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <Requests searchParams={searchParams} />
    </Suspense>
  );
}

async function Requests({ searchParams }: { searchParams: SearchParams }) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  // The tool's own read: the address's filters are its arguments, and the sort and page the table may set ride along.
  const { data } = await requestsTool.read({ status: one(p.status) as 'all' | undefined, method: one(p.method), region: one(p.region), q: one(p.q), ...(p.sort || p.dir || p.page ? { sort: one(p.sort), dir: one(p.dir), page: one(p.page) } : {}) } as Parameters<typeof requestsTool.read>[0]);
  return <EmbedRequests {...data} />;
}
