import Link from 'next/link';
import { getOrders, getShops, total } from '@/lib/api';

export default async function Home() {
  const [orders, shops] = await Promise.all([getOrders(), getShops()]);
  const today = orders.filter((o) => o.pickupAt.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const late = orders.filter((o) => o.status === 'late');
  const revenue = today.reduce((s, o) => s + total(o), 0);
  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Crumb &amp; Co — Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white shadow rounded-lg p-4"><div className="text-gray-500 text-sm">Orders today</div><div className="text-2xl font-bold">{today.length}</div></div>
        <div className="bg-white shadow rounded-lg p-4"><div className="text-gray-500 text-sm">Late pickups</div><div className="text-2xl font-bold text-red-600">{late.length}</div></div>
        <div className="bg-white shadow rounded-lg p-4"><div className="text-gray-500 text-sm">Revenue today</div><div className="text-2xl font-bold">£{revenue.toFixed(2)}</div></div>
        <div className="bg-white shadow rounded-lg p-4"><div className="text-gray-500 text-sm">Shops</div><div className="text-2xl font-bold">{shops.length}</div></div>
      </div>
      <h2 className="text-xl font-semibold mb-2">Recent orders</h2>
      <ul className="divide-y">
        {orders.slice(0, 8).map((o) => (
          <li key={o.id} className="py-2 flex justify-between"><Link href={`/orders/${o.id}`} className="text-blue-600 underline">{o.customer}</Link><span>{o.status}</span></li>
        ))}
      </ul>
      <div className="mt-6 space-x-4"><Link href="/orders" className="text-blue-600">All orders</Link><Link href="/shops" className="text-blue-600">Shops</Link></div>
    </main>
  );
}
