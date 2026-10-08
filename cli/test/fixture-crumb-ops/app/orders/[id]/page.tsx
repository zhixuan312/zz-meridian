import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getOrder, total } from '@/lib/api';
import { changeStatus } from '../../actions';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id).catch(() => null);
  if (!order) notFound();
  return (
    <main className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Order {order.id}</h1>
      <p className="text-gray-500">{order.customer} · pickup {new Date(order.pickupAt).toLocaleString()} · {order.status}</p>
      <table className="w-full mt-4">
        <tbody>{order.items.map((i) => <tr key={i.product}><td>{i.product}</td><td>×{i.qty}</td><td>£{(i.qty * i.price).toFixed(2)}</td></tr>)}</tbody>
      </table>
      <p className="font-bold mt-2">Total £{total(order).toFixed(2)}</p>
      <div className="flex gap-2 mt-4">
        <form action={changeStatus.bind(null, order.id, 'ready')}><Button>Mark ready</Button></form>
        <form action={changeStatus.bind(null, order.id, 'collected')}><Button>Mark collected</Button></form>
      </div>
    </main>
  );
}
