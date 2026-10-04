import { PageFrame } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { MissingAddress, WayBack } from '@/views/not-found-address';
import { NOT_FOUND } from '@/views/not-found';

export const metadata = { title: 'Not found' };

/**
 * A console address that leads nowhere, such as a deleted record: said in place, so the rail stays where it was. The
 * address itself is the protagonist, walked back to the nearest page that exists, and that page is the first way back.
 */
export default function DashboardNotFound() {
  return (
    <PageFrame kicker={NOT_FOUND.kicker} title={NOT_FOUND.sentence.replace(/\.$/, '')} description={NOT_FOUND.lead} width="reading">
      <Card className="arrive gap-8 p-(--card-pad)">
        <MissingAddress />
        <div className="flex flex-wrap gap-2.5 max-sm:[&>*]:w-full"><WayBack size="md" search /></div>
      </Card>
    </PageFrame>
  );
}
