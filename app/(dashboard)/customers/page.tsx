import { Suspense } from 'react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { CUSTOMERS } from '@/data/sample';
import { CustomersView, InviteCustomer } from '@/views/customers';
import { Busy, TableSkeleton, TilesSkeleton } from '../_loading';

export const metadata = { title: 'Customers' };

/** The masthead sits outside the boundary that reads the address (the table's filters), so a cold load has its title in the first HTML. */
export default function CustomersPage() {
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
