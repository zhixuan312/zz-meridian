'use client';

import { Specimen } from '@/system/specimen';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { KeyValue } from '.';

export default function KeyValuePreview() {
  return (
    <>
      <Specimen label="One column" note="A record's facts, in reading order." stack>
        <KeyValue
          className="max-w-md"
          items={[
            { label: 'Request ID', value: 'req_8f2k1x9a3m4c', mono: true, action: <IconButton label="Copy request ID" tooltip size="sm" icon={<Copy />} onClick={() => void navigator.clipboard?.writeText('req_8f2k1x9a3m4c')} /> },
            { label: 'Endpoint', value: 'POST /v1/messages', mono: true },
            { label: 'Status', value: <Badge tone="critical">503 Unavailable</Badge> },
            { label: 'Latency', value: '1.8s' },
            { label: 'Customer', value: <a href="/customers" className="link">Parallax AI</a> },
          ]}
        />
      </Specimen>
      <Specimen label="Two columns" note="From 640px; one column on phones." stack>
        <KeyValue
          columns={2}
          items={[
            { label: 'Region', value: 'eu-west-1' },
            { label: 'Model', value: 'meridian-large' },
            { label: 'Input', value: '12,480 tokens' },
            { label: 'Output', value: '1,206 tokens' },
          ]}
        />
      </Specimen>
    </>
  );
}
