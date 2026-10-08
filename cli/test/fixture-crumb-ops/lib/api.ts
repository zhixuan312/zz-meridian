// Our backend. Every page reads through here; API_URL comes from .env.
export type Shop = { id: string; name: string; city: string; opensAt: string };
export type OrderStatus = 'placed' | 'baking' | 'ready' | 'collected' | 'late';
export type Order = {
  id: string;
  shopId: string;
  customer: string;
  items: { product: string; qty: number; price: number }[];
  pickupAt: string;
  status: OrderStatus;
  createdAt: string;
};

const base = () => process.env.API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${path} answered ${res.status}`);
  return res.json() as Promise<T>;
}

export const getShops = () => get<Shop[]>('/shops');
export const getOrders = (status?: string) => get<Order[]>(`/orders${status ? `?status=${status}` : ''}`);
export const getOrder = (id: string) => get<Order>(`/orders/${id}`);

export async function deleteOrder(id: string) {
  const res = await fetch(`${base()}/orders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`delete answered ${res.status}`);
}
export async function setStatus(id: string, status: OrderStatus) {
  const res = await fetch(`${base()}/orders/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
  if (!res.ok) throw new Error(`update answered ${res.status}`);
}
export const total = (o: Order) => o.items.reduce((s, i) => s + i.qty * i.price, 0);
