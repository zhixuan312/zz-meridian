import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { gate, gatedMetadata } from '@/data/access';
import { readAll } from '@/data/read';
import type { CustomerRecord } from '@/data/sample';
import { CustomersView } from '@/views/customers';
import { customerRow } from '@/views/customers-context';
import { Busy } from '@/components/patterns/page-loading';
import { RecordsSkeleton } from '@/components/templates/records';

export function generateMetadata() {
  return gatedMetadata('customers', { title: 'Customers' });
}

/**
 * The page asks its feature before it renders; the rail hiding `/customers` is presentation, never this gate. The
 * masthead then sits outside the boundary that reads the address (the table's filters), and the boundary is where the
 * page reads its records.
 */
export default async function CustomersPage() {
  const denied = await gate('customers');
  if (denied) return denied;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Customers"
      description="Who is calling the API, on which plan, and the revenue each brought in the last 30 days."
    >
      <Suspense
        fallback={
          <Busy name="customers">
            <RecordsSkeleton tiles={3} rows={8} />
          </Busy>
        }
      >
        <Customers />
      </Suspense>
    </PageFrame>
  );
}

/**
 * The page's one read of the customers, through `read()`: `customers:read` is asked on the same path as every other
 * collection, so a policy that does not bind the collection (or a person who does not hold the grant) refuses here before
 * a row is drawn, exactly as it does for the members, the keys and the request log.
 */
async function Customers() {
  // Every customer, not a first page: the tiles are sums over them, and Home's read counts them the same way.
  // The client is handed the fields a row draws, and not what only a customer's own page shows (its requests by route).
  const { rows } = await readAll('customers');
  return <CustomersView rows={(rows as CustomerRecord[]).map(customerRow)} />;
}
