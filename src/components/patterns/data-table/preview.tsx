'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/patterns/filter-bar';
import { REQUESTS } from '@/system/fixtures/relay';
import { requestColumns } from '@/views/requests';
import { DataTable, type TableState } from '.';

const rows = REQUESTS.slice(0, 26);
const few = REQUESTS.slice(0, 4);
const compact = requestColumns.filter((c) => ['request', 'status', 'latency', 'at'].includes(c.key));

export default function DataTablePreview() {
  const [state, setState] = useState<TableState>({ sort: 'latency', dir: 'desc', page: '1' });
  const [selected, setSelected] = useState<Set<string>>(new Set([rows[1].id]));
  const [q, setQ] = useState('');
  return (
    <>
      <Specimen label="Default" note="Sorted by latency, paged at 20. The title column links to the record; the whole row takes the pointer." stack>
        <DataTable
          caption="Requests"
          noun="requests"
          rows={rows.filter((r) => !q || r.route.includes(q) || r.customer.toLowerCase().includes(q.toLowerCase()))}
          columns={requestColumns}
          rowKey={(r) => r.id}
          rowHref={(r) => `/requests/${r.id}`}
          state={state}
          onStateChange={(p) => setState((s) => ({ ...s, ...p }))}
          filtered={q !== ''}
          onClearFilters={() => setQ('')}
          toolbar={<FilterBar search={{ value: q, onChange: setQ, placeholder: 'Search requests' }} result={<>{rows.length} requests</>} />}
        />
      </Specimen>
      <Specimen label="Selectable" note="A checkbox column; the head selects the page. Selected rows take the accent wash." stack>
        <DataTable caption="Requests" noun="requests" rows={few} columns={compact} rowKey={(r) => r.id} selectable selected={selected} onSelectedChange={setSelected} />
      </Specimen>
      <Specimen label="Loading" note="Skeleton rows shaped like real rows, so nothing jumps when data lands." stack>
        <DataTable caption="Requests" noun="requests" rows={[]} columns={compact} rowKey={(r) => r.id} loading pageSize={5} />
      </Specimen>
      <Specimen label="Empty" note="First run offers the action that fills it; filtered-out offers Clear filters; an error offers Retry." stack>
        <DataTable caption="API keys" noun="keys" rows={[]} columns={compact} rowKey={(r) => r.id} empty={{ title: 'No keys yet', body: 'Create a key for each service that calls Relay.', action: <Button size="sm" variant="primary" icon={<Plus />}>Create key</Button> }} />
        <DataTable caption="Requests" noun="requests" rows={[]} columns={compact} rowKey={(r) => r.id} filtered onClearFilters={() => {}} />
        <DataTable caption="Requests" noun="requests" rows={[]} columns={compact} rowKey={(r) => r.id} error="The log service did not answer within 10 seconds." onRetry={() => {}} />
      </Specimen>
    </>
  );
}
