import { Suspense } from 'react';
import { CUSTOMERS } from '@/data/sample';
import { CustomersView } from '@/views/customers';

export const metadata = { title: 'Customers' };

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersView rows={CUSTOMERS} />
    </Suspense>
  );
}
