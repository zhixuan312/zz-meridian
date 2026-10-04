import { requests } from '@/data/collections';
import { FEATURED_REQUEST_IDS, traceOf, payloadsOf } from '@/system/fixtures/sample-records';
import { MissingPage } from '@/views/missing-page';
import { RequestView } from '@/views/request';

export function generateStaticParams() {
  return FEATURED_REQUEST_IDS.map((id) => ({ id }));
}

const byId = async (id: string) => (await requests.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (await byId(id)) ? { title: id } : { title: 'Not found', robots: { index: false } };
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await byId(id);
  // Rendered here rather than thrown, so the screen is in the first HTML (see MissingPage).
  if (!r) return <MissingPage />;
  return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} />;
}
