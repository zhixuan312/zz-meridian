'use client';

import { Copy, Download, RotateCw, ShieldBan, Terminal } from 'lucide-react';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailHead } from '.';

const noop = () => {};

export default function DetailHeadPreview() {
  return (
    <>
      <Specimen label="A record by ID" note="The ID in mono at 60% of the title size, its state beside it, the facts that identify it under it." stack>
        <Card className="p-(--card-pad)">
          <DetailHead
            parent={{ label: 'Requests', href: '/requests' }}
            name="req_jqwm3le188pi"
            mono
            status={{ tone: 'critical', label: '503 Unavailable' }}
            facts={[<span key="r" className="font-mono text-[0.9em] text-ink">POST /v1/messages</span>, '2.1s', 'Parallax AI', '1 h ago']}
            primary={<><Button icon={<Terminal />}>Copy as cURL</Button><Button variant="primary" icon={<RotateCw />}>Replay</Button></>}
            more={[{ label: 'Copy request ID', icon: <Copy />, onSelect: noop }, { label: 'Block this key', icon: <ShieldBan />, tone: 'critical', onSelect: noop }]}
          />
        </Card>
      </Specimen>
      <Specimen label="A record by name" stack>
        <Card className="p-(--card-pad)">
          <DetailHead
            parent={{ label: 'Customers', href: '/customers' }}
            name="Northwind Labs"
            status={{ tone: 'positive', label: 'Active' }}
            facts={['Enterprise', '643K requests', '$66.86 this month', 'since 03 Sept 2026']}
            primary={<Button icon={<Download />}>Export usage</Button>}
          />
        </Card>
      </Specimen>
      <Specimen label="Compact" note="In an embed or a sheet: section-sized title, small facts." stack>
        <Card className="p-(--card-pad)">
          <DetailHead compact parent={{ label: 'Requests', href: '/requests' }} name="req_qmi1vbyi3uqt" mono status={{ tone: 'positive', label: '200 OK' }} facts={['GET /v1/documents/:id', '51ms', 'Northwind Labs']} />
        </Card>
      </Specimen>
    </>
  );
}
