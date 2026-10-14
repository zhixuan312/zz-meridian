/**
 * The read behind Main's three summaries. Each summary is built from every row of the collections it counts, through
 * `read()`, so it is scoped to whoever is asking; it is read apart from the other two, and one that cannot be read is
 * `null` while the others still answer. The figures are worked out in `src/views/main-summary.ts`, by the functions the
 * detail pages use.
 */
import { requireNeed } from '@/data/access';
import { readReleases } from '@/data/engineering';
import { FEATURES } from '@/data/features';
import { readIncidents, readServices } from '@/data/metrics';
import { readAll } from '@/data/read';
import type { CustomerRecord, Ticket, VerificationRun } from '@/data/sample';
import { businessOf, deliveryOf, operationOf, type MainSummary } from '@/views/main-summary';

/** A read that throws is missing, not zero: a summary, the history a title is worked out from, the services a title names. */
export async function attempt<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/** Main's summaries of the business, the operation and delivery. Refused, before any read, to a person without the Home's need. */
export async function readMainSummary(): Promise<MainSummary> {
  await requireNeed(FEATURES.home.needs);
  const [business, operation, delivery] = await Promise.all([
    attempt(async () => businessOf((await readAll('customers')).rows as CustomerRecord[])),
    attempt(async () => operationOf(await readServices(), (await readIncidents()).all)),
    attempt(async () => {
      const [tickets, runs, releases] = await Promise.all([readAll('tickets'), readAll('tests'), readReleases()]);
      return deliveryOf(tickets.rows as Ticket[], runs.rows as VerificationRun[], releases.rows);
    }),
  ]);
  return { business, operation, delivery };
}
