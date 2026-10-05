import { Suspense } from 'react';
import { connection } from 'next/server';
import { Skeleton } from '@/components/ui/skeleton';
import { SampleFooter } from '@/views/sample-footer';
import { Standalone } from '@/views/standalone';
import { MissingAddress, WayBack } from '@/views/not-found-address';
import { NOT_FOUND } from '@/views/not-found';

export const metadata = { title: 'Not found' };

/** The address and the ways back, which depend on the path that was asked for: resolved at request time, never prerendered. */
async function Address() {
  // A prerendered screen would name /_not-found instead of the address asked for, so the path is read only once the request is known.
  await connection();
  return (
    <>
      <div className="mt-8 max-w-[46ch] rounded-md border border-line bg-surface-sunk px-4 py-3.5"><MissingAddress size="quiet" /></div>
      <div className="mt-9 flex flex-wrap gap-3 max-sm:[&>*]:w-full"><WayBack /></div>
    </>
  );
}

/** What stands in for them while the request resolves: the same boxes at the same sizes, so the sentence above never moves. */
function AddressPlace() {
  return (
    <>
      <div aria-hidden className="mt-8 flex max-w-[46ch] flex-col gap-2.5 rounded-md border border-line bg-surface-sunk px-4 py-3.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <div aria-hidden className="mt-9 flex flex-wrap gap-3 max-sm:[&>*]:w-full">
        <Skeleton className="h-12 w-44 rounded-md" />
        <Skeleton className="h-12 w-36 rounded-md" />
      </div>
    </>
  );
}

/** Any address that leads nowhere outside the console: say so plainly, show the address, offer the nearest way back. */
export default function NotFound() {
  return (
    <Standalone kicker={NOT_FOUND.kicker} sentence={NOT_FOUND.sentence} lead={NOT_FOUND.lead} footer={<SampleFooter />}>
      <Suspense fallback={<AddressPlace />}>
        <Address />
      </Suspense>
    </Standalone>
  );
}
