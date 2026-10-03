import { Suspense } from 'react';
import { CUSTOMERS } from '@/system/fixtures/sample-records';
import { CustomersView } from '@/views/customers';

export const metadata = { title: 'Customers' };

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersView rows={CUSTOMERS} />
    </Suspense>
  );
}
