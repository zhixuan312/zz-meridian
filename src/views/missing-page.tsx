import { PageFrame } from '@/components/base/shell';
import { Card } from '@/components/ui/card';
import { MissingAddress, WayBack } from '@/views/not-found-address';
import { NOT_FOUND } from '@/views/not-found';

/**
 * A console address that leads nowhere, said in place so the rail stays where it was. The address itself is the
 * protagonist, walked back to the nearest page that exists, and that page is the first way back.
 *
 * A record page renders this itself when its ID is missing rather than throwing notFound(): thrown inside the
 * dashboard's loading boundary, notFound() is rendered only once the JavaScript arrives, which on a slow phone pushed
 * the largest paint past 2.5s.
 */
export function MissingPage() {
  return (
    <PageFrame kicker={NOT_FOUND.kicker} title={NOT_FOUND.sentence.replace(/\.$/, '')} description={NOT_FOUND.lead} width="reading">
      <Card className="arrive gap-8 p-(--card-pad)">
        <MissingAddress />
        <div className="flex flex-wrap gap-2.5 max-sm:[&>*]:w-full"><WayBack size="md" search /></div>
      </Card>
    </PageFrame>
  );
}
