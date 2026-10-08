import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getOrders, total } from '@/lib/api';
import { removeOrder } from '../actions';

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const orders = await getOrders(status);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <div className="flex gap-2 mb-4">
        {['all', 'placed', 'baking', 'ready', 'late', 'collected'].map((s) => (
          <Link key={s} href={s === 'all' ? '/orders' : `/orders?status=${s}`} className={`px-3 py-1 rounded-full border ${status === s || (!status && s === 'all') ? 'bg-black text-white' : ''}`}>{s}</Link>
        ))}
      </div>
      <table className="w-full text-left">
        <thead><tr className="border-b"><th>Order</th><th>Customer</th><th>Shop</th><th>Pickup</th><th>Status</th><th>Total</th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td><Link href={`/orders/${o.id}`} className="text-blue-600">{o.id}</Link></td>
              <td>{o.customer}</td><td>{o.shopId}</td><td>{new Date(o.pickupAt).toLocaleString()}</td><td>{o.status}</td><td>£{total(o).toFixed(2)}</td>
              <td><form action={removeOrder.bind(null, o.id)}><Button className="bg-red-600">Delete</Button></form></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
