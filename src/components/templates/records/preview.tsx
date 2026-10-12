'use client';

import { Specimen } from '@/system/specimen';
import { MetricTile } from '@/components/patterns/metric-tile';
import { DataTable } from '@/components/patterns/data-table';
import { FilterBar } from '@/components/patterns/filter-bar';
import { Button } from '@/components/ui/button';
import { REQUESTS } from '@/system/fixtures/sample';
import { requestColumns } from '@/system/sample-cells';
import { Records } from '.';

const rows = REQUESTS.slice(0, 6);
const compact = requestColumns.filter((c) => ['request', 'status', 'latency', 'at'].includes(c.key));
const table = (extra: object = {}) => (
  <DataTable
    caption="Requests"
    noun="requests"
    rows={rows}
    columns={compact}
    rowKey={(r) => r.id}
    toolbar={<FilterBar search={{ value: '', onChange: () => {}, placeholder: 'Search requests' }} result={<>{rows.length} requests</>} />}
    {...extra}
  />
);

export default function RecordsPreview() {
  return (
    <>
      <Specimen label="With a summary" note="Three tiles over the table: the tiles row counts its children and sets its columns." stack>
        <Records
          summary={[
            <MetricTile key="a" label="Requests" value={2_943_120} format="count" />,
            <MetricTile key="b" label="Error rate" value={0.009} format="percent" intent="down" />,
            <MetricTile key="c" label="Latency p95" value={294} format="duration" intent="down" />,
          ]}
        >
          {table()}
        </Records>
      </Specimen>
      <Specimen label="Without a summary" note="No tiles row is drawn; the table is the page." stack>
        <Records>{table()}</Records>
      </Specimen>
      <Specimen label="Empty" note="First run: the table offers the action that fills it." stack>
        <Records>{table({ caption: 'API keys', noun: 'keys', rows: [], empty: { title: 'No keys yet', body: 'Create a key for each service that calls the API.', action: <Button size="sm" variant="primary">Create key</Button> } })}</Records>
      </Specimen>
      <Specimen label="Filtered-empty" note="The filters left nothing: the table offers Clear filters, not Create." stack>
        <Records>{table({ rows: [], filtered: true, onClearFilters: () => {} })}</Records>
      </Specimen>
    </>
  );
}
