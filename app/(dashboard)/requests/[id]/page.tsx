import { notFound } from 'next/navigation';
import { FEATURED_REQUEST_IDS, requestById, traceOf, payloadsOf } from '@/system/fixtures/sample-records';
import { RequestView } from '@/views/request';

export function generateStaticParams() {
  return FEATURED_REQUEST_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: requestById(id) ? id : 'Request not found' };
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = requestById(id);
  if (!r) notFound();
  return <RequestView request={r} trace={traceOf(r)} payloads={payloadsOf(r)} />;
}
