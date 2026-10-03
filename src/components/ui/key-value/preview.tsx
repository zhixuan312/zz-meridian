'use client';

import { Specimen } from '@/system/specimen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeyValue } from '.';

export default function KeyValuePreview() {
  return (
    <>
      <Specimen label="One column" note="A record's facts, in reading order." stack>
        <KeyValue
          className="max-w-md"
          items={[
            { label: 'Request ID', value: 'req_8f2k1x9a3m4c', mono: true },
            { label: 'Endpoint', value: 'POST /v1/messages', mono: true },
            { label: 'Status', value: <Badge tone="critical">503 Unavailable</Badge> },
            { label: 'Latency', value: '1,842ms' },
            { label: 'Customer', value: 'Parallax AI', action: <Button variant="ghost" size="sm">View</Button> },
          ]}
        />
      </Specimen>
      <Specimen label="Two columns" note="From 640px; one column on phones." stack>
        <KeyValue
          columns={2}
          items={[
            { label: 'Region', value: 'eu-west-1' },
            { label: 'Model', value: 'relay-large' },
            { label: 'Input', value: '12,480 tokens' },
            { label: 'Output', value: '1,206 tokens' },
          ]}
        />
      </Specimen>
    </>
  );
}
