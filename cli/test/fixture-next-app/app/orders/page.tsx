import { listOrders } from '@/lib/orders';
import { ExportButton } from './export-button';

export default async function OrdersPage() {
  const orders = await listOrders();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Orders</h1>
      <ul>{orders.map((o) => <li key={o.id}>{o.customer}: {o.total}</li>)}</ul>
      <ExportButton />
    </main>
  );
}
