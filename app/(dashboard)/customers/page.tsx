import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { gate } from '@/data/access';
import { read } from '@/data/read';
import type { CustomerRecord } from '@/data/sample';
import { CustomersView, InviteCustomer } from '@/views/customers';
import { Busy, TableSkeleton, TilesSkeleton } from '../_loading';

export const metadata = { title: 'Customers' };

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
      description="Who is calling the API, on which plan, and what they spent in the last 30 days."
      actions={<InviteCustomer />}
    >
      <Suspense
        fallback={
          <Busy name="customers">
            <TilesSkeleton />
            <TableSkeleton rows={8} />
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
  const { rows } = await read('customers');
  return <CustomersView rows={rows as CustomerRecord[]} />;
}
