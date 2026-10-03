import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Standalone } from '@/views/standalone';

export const metadata = { title: 'Not found' };

/** Any address that leads nowhere: say so plainly and offer the way back. */
export default function NotFound() {
  return (
    <Standalone
      kicker="404 · Not found"
      sentence="This page isn’t here."
      lead="The address may be old, or the record may have been deleted. Everything that exists is one search away from the Overview."
    >
      <div className="mt-9 flex flex-wrap gap-3">
        <Button asChild variant="primary" size="lg"><Link href="/"><ArrowLeft className="size-[18px]" />Go to Overview</Link></Button>
        <Button asChild size="lg"><Link href="/health">Check service health</Link></Button>
      </div>
    </Standalone>
  );
}
