'use client';

import { KeyRound, Plus, RotateCw } from 'lucide-react';
import { Plane, Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { AppMark } from '@/components/base/app-mark';
import { EmptyState, EmptyStateArt } from '.';

export default function EmptyStatePreview() {
  return (
    <>
      <Specimen label="First run" note="Nothing has been created yet: say what will appear here and offer to create it.">
        <Plane on="surface" className="p-0">
          <EmptyState kind="first-run" icon={<KeyRound />} title="No API keys yet" action={<Button variant="primary" icon={<Plus />}>Create key</Button>}>
            Create a key to start sending requests. You will see it once, so keep it somewhere safe.
          </EmptyState>
        </Plane>
      </Specimen>
      <Specimen label="Filtered out" note="Something exists, the filters hide it: name the filters and offer to clear them.">
        <Plane on="surface" className="p-0">
          <EmptyState kind="filtered" title="No requests match these filters" action={<Button>Clear filters</Button>}>
            Status 5xx and customer Northwind Labs found nothing in the last 7 days.
          </EmptyState>
        </Plane>
      </Specimen>
      <Specimen label="Error" note="It failed to load: say what failed, not that something went wrong, and offer Retry.">
        <Plane on="surface" className="p-0">
          <EmptyState kind="error" title="Requests did not load" action={<Button icon={<RotateCw />}>Retry</Button>}>
            The log service timed out after 10 seconds. Your data is safe.
          </EmptyState>
        </Plane>
      </Specimen>
      <Specimen label="The product's own art" note="EmptyStateArt, provided once near the root, replaces the disc on every centred empty state, a Data table's included. Here, the product's mark.">
        <Plane on="surface" className="p-0">
          <EmptyStateArt value={{ 'first-run': <AppMark size={32} /> }}>
            <EmptyState kind="first-run" title="No API keys yet">Keys let your services call the API. Create one per service, with only the scopes it needs.</EmptyState>
          </EmptyStateArt>
        </Plane>
      </Specimen>
      <Specimen label="Inline" note="Inside a list or a card body, where a row would be." stack>
        <Plane on="surface" className="py-3">
          <EmptyState layout="inline" kind="first-run" title="No webhooks" action={<Button size="sm" icon={<Plus />}>Add webhook</Button>}>
            Get an event when a request fails or a key is rotated.
          </EmptyState>
        </Plane>
        <Plane on="surface" className="py-3">
          <EmptyState layout="inline" kind="filtered" title="Nothing in the last hour" action={<Button size="sm" variant="ghost">Show 24 hours</Button>} />
        </Plane>
      </Specimen>
    </>
  );
}
