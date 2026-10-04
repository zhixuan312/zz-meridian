import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Acme console</h1>
      <Link href="/orders">Orders</Link>
    </main>
  );
}
