'use client';

import { useState } from 'react';
import { Plane, Specimen } from '@/system/specimen';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type SortDirection } from '.';

const ROWS = [
  { id: 'req_8f3k2m1x', method: 'POST', route: '/v1/messages', status: 201, latency: 612, customer: 'Parallax AI', region: 'us-east-1' },
  { id: 'req_2b9qz7tw', method: 'GET', route: '/v1/search', status: 200, latency: 188, customer: 'Northwind Labs', region: 'eu-west-1' },
  { id: 'req_m4p0c8ve', method: 'POST', route: '/v1/files', status: 503, latency: 4210, customer: 'Halcyon Health', region: 'us-east-1' },
  { id: 'req_x71hd3ka', method: 'POST', route: '/v1/embeddings', status: 201, latency: 241, customer: 'Atlas Freight', region: 'ap-southeast-1' },
  { id: 'req_q9w2e5ru', method: 'GET', route: '/v1/documents/:id', status: 429, latency: 74, customer: 'Mosaic Learning', region: 'us-west-2' },
];

function Status({ code }: { code: number }) {
  const tone = code >= 500 ? 'text-critical-ink' : code >= 400 ? 'text-warning-ink' : 'text-ink-2';
  const dot = code >= 500 ? 'bg-critical' : code >= 400 ? 'bg-warning' : 'bg-positive';
  return <span className={`t-num inline-flex items-center gap-1.5 ${tone}`}><span aria-hidden className={`size-1.5 rounded-full ${dot}`} />{code}</span>;
}

export default function TablePreview() {
  const [sort, setSort] = useState<{ key: 'latency' | 'status'; dir: SortDirection }>({ key: 'latency', dir: 'desc' });
  const rows = [...ROWS].sort((a, b) => (sort.dir === 'asc' ? 1 : -1) * (a[sort.key] - b[sort.key]));
  const toggle = (key: 'latency' | 'status') => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  return (
    <>
      <Specimen label="Sortable" note="Sorted by latency; hover a head to see it can sort. Region drops under 1024px, customer under 768px." stack>
        <Plane on="surface" className="overflow-hidden p-0">
          <Table caption="Recent requests">
            <TableHead>
              <tr>
                <TableHeader grow>Request</TableHeader>
                <TableHeader sort={sort.key === 'status' ? sort.dir : false} onSort={() => toggle('status')}>Status</TableHeader>
                <TableHeader hideBelow="md">Customer</TableHeader>
                <TableHeader hideBelow="lg">Region</TableHeader>
                <TableHeader align="right" sort={sort.key === 'latency' ? sort.dir : false} onSort={() => toggle('latency')}>Latency</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} interactive>
                  <TableCell truncate>
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="w-10 shrink-0 font-mono text-2xs text-ink-3">{r.method}</span>
                      <span className="truncate font-mono text-xs">{r.route}</span>
                    </span>
                  </TableCell>
                  <TableCell><Status code={r.status} /></TableCell>
                  <TableCell hideBelow="md" muted className="whitespace-nowrap">{r.customer}</TableCell>
                  <TableCell hideBelow="lg" muted>{r.region}</TableCell>
                  <TableCell numeric className={r.latency > 1000 ? 'font-medium text-critical-ink' : undefined}>{r.latency.toLocaleString('en-US')} ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Plane>
      </Specimen>
      <Specimen label="Row states" stack>
        <Plane on="surface" className="overflow-hidden p-0">
          <Table caption="Row states">
            <TableHead>
              <tr><TableHeader grow>Customer</TableHeader><TableHeader>State</TableHeader><TableHeader align="right">Requests</TableHeader></tr>
            </TableHead>
            <TableBody>
              <TableRow><TableCell>Parallax AI</TableCell><TableCell muted>Rest</TableCell><TableCell numeric>642,860</TableCell></TableRow>
              <TableRow className="bg-fill-hover"><TableCell>Northwind Labs</TableCell><TableCell muted>Hover</TableCell><TableCell numeric>375,000</TableCell></TableRow>
              <TableRow selected><TableCell>Halcyon Health</TableCell><TableCell muted>Selected</TableCell><TableCell numeric>264,700</TableCell></TableRow>
              <TableRow><TableCell className="text-ink-disabled">Brightline</TableCell><TableCell className="text-ink-disabled">Archived</TableCell><TableCell numeric className="text-ink-disabled">—</TableCell></TableRow>
            </TableBody>
          </Table>
        </Plane>
      </Specimen>
    </>
  );
}
