import { nav } from '@/app.config';
import { navTrail } from '@/components/patterns/rail/trail';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LoadingPage } from '@/components/patterns/page-loading';
import { gatedLoading } from '@/data/refusal';
import { RecordsSkeleton } from '@/components/templates/records';

/** Requests on its way: three tiles over a few table rows; the page's own fallback is the same, so a navigation does not jump. */
export default function RequestsLoading() {
  return (
    <LoadingPage {...gatedLoading({ name: 'requests', title: 'Requests', kicker: <Breadcrumb items={navTrail('/requests', nav)} /> })}>
      <RecordsSkeleton tiles={3} rows={3} filters={false} />
    </LoadingPage>
  );
}
