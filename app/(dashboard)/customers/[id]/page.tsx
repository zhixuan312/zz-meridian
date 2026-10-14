import { cache } from 'react';
import { gate, gatedMetadata, may, Unauthenticated } from '@/data/access';
import { FEATURES } from '@/data/features';
import { CustomerView } from '@/views/customer';
import { MissingPage } from '@/views/missing-page';
import { NOT_FOUND } from '@/views/not-found';
import { readCustomer } from '@/views/tools';

/** The page's one read, shared by its metadata and its body. */
const readOne = cache(readCustomer);

/** The customers whose pages are built ahead of time, the three largest; any other id renders on its first request. */
export function generateStaticParams() {
  return ['northwind-labs', 'halcyon-health', 'atlas-freight'].map((id) => ({ id }));
}

/**
 * The record's own title, for a person who may open the customer: its name, or the missing-record screen. A person who
 * may not is told what the product's refusal says (`gatedMetadata`: the feature's own title, or the missing page's), and
 * no record is read for them — the metadata runs before the page's gate and must not become the read that discloses
 * what the gate then refuses. No session is the same answer.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await may(FEATURES.customer.needs).catch((error: unknown) => {
    if (error instanceof Unauthenticated) return false;
    throw error;
  });
  if (!allowed) return gatedMetadata('customer', { title: FEATURES.customer.title });
  const found = await readOne(id);
  return found ? { title: found.customer.name } : { title: NOT_FOUND.title, robots: { index: false } };
}

/** The detail asks its feature first, before the record is read: the rail never links this route, and hiding is presentation, not the gate. */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await gate('customer');
  if (denied) return denied;
  const found = await readOne(id);
  // Rendered here rather than thrown, so the screen is in the first HTML (see MissingPage).
  if (!found) return <MissingPage />;
  return <CustomerView {...found} />;
}
