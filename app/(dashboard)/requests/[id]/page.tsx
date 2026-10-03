import { notFound } from 'next/navigation';
import { requests } from '@/data/collections';
import { FEATURED_REQUEST_IDS, traceOf, payloadsOf } from '@/system/fixtures/sample-records';
import { RequestView } from '@/views/request';

export function generateStaticParams() {
  return FEATURED_REQUEST_IDS.map((id) => ({ id }));
}

const byId = async (id: string) => (await requests.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: (await byId(id)) ? id : 'Request not found' };
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await byId(id);
  if (!r) notFound();
  return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} />;
}
