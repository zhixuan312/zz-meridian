import { connection } from 'next/server';
import { Standalone } from '@/views/standalone';
import { MissingAddress, WayBack } from '@/views/not-found-address';
import { NOT_FOUND } from '@/views/not-found';

export const metadata = { title: 'Not found' };

/** Any address that leads nowhere outside the console: say so plainly, show the address, offer the nearest way back. */
export default async function NotFound() {
  // Rendered per request, never prerendered: a prerendered screen would name /_not-found instead of the address asked for.
  await connection();
  return (
    <Standalone kicker={NOT_FOUND.kicker} sentence={NOT_FOUND.sentence} lead={NOT_FOUND.lead}>
      <div className="mt-8 max-w-[46ch] rounded-md border border-line bg-surface-sunk px-4 py-3.5"><MissingAddress size="quiet" /></div>
      <div className="mt-9 flex flex-wrap gap-3 max-sm:[&>*]:w-full"><WayBack /></div>
    </Standalone>
  );
}
