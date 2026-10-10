import { PageFrame } from '@/components/base/shell';
import { Card } from '@/components/ui/card';

/**
 * What a page shows a person who may not open it: the title they followed, and one honest sentence.
 *
 * A page returns this itself once authorization says no, and before any protected read — so the answer is a normal 200
 * that holds none of the records, never a disguised 404. It is a server component and reaches no router, so a refused
 * request costs the least. Phase 1 replaces this body with the `no-access` kind of `EmptyState` and its generated copy;
 * until then it stays small and honest.
 */
export function NoAccess({ title }: { title: string }) {
  return (
    <PageFrame title={title}>
      <Card data-no-access className="flex flex-col items-center px-6 py-14 text-center">
        <p className="t-lead max-w-sm text-balance text-ink-2">You do not have access to this page.</p>
      </Card>
    </PageFrame>
  );
}
