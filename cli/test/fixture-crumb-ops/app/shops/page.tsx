import { getShops } from '@/lib/api';

export default async function Shops() {
  const shops = await getShops();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Shops</h1>
      <div className="grid grid-cols-3 gap-4">
        {shops.map((s) => <div key={s.id} className="border rounded p-4"><h2 className="font-semibold">{s.name}</h2><p>{s.city}</p><p className="text-sm text-gray-500">Opens {s.opensAt}</p></div>)}
      </div>
    </main>
  );
}
