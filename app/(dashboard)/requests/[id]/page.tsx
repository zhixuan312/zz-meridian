import { read } from '@/data/read';
import { FEATURED_REQUEST_IDS, traceOf, payloadsOf, type RequestRow } from '@/data/sample';
import { MissingPage } from '@/views/missing-page';
import { RequestView } from '@/views/request';

export function generateStaticParams() {
  return FEATURED_REQUEST_IDS.map((id) => ({ id }));
}

const byId = async (id: string) => {
  const { rows, observedAt } = await read('requests', { where: [{ field: 'id', op: 'eq', value: id }] });
  return { request: rows[0] as RequestRow | undefined, observedAt };
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (await byId(id)).request ? { title: id } : { title: 'Not found', robots: { index: false } };
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { request: r, observedAt } = await byId(id);
  // Rendered here rather than thrown, so the screen is in the first HTML (see MissingPage).
  if (!r) return <MissingPage />;
  return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} now={observedAt} />;
}
