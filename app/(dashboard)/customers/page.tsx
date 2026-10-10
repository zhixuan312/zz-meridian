import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { gate } from '@/data/access';
import { CUSTOMERS } from '@/data/sample';
import { CustomersView, InviteCustomer } from '@/views/customers';
import { Busy, TableSkeleton, TilesSkeleton } from '../_loading';

export const metadata = { title: 'Customers' };

/** The page asks its feature before it renders; the rail hiding `/customers` is presentation, never this gate. The masthead then sits outside the boundary that reads the address (the table's filters). */
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
        <CustomersView rows={CUSTOMERS} />
      </Suspense>
    </PageFrame>
  );
}
