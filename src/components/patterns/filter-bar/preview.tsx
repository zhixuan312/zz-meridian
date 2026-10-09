'use client';

import { useState } from 'react';
import { Specimen } from '@/system/specimen';
import { Segmented } from '@/components/ui/segmented';
import { FilterBar } from '.';

const opts = (vals: string[]) => [{ value: 'all', label: 'All' }, ...vals.map((v) => ({ value: v, label: v }))];

export default function FilterBarPreview() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [view, setView] = useState('table');
  const [agent, setAgent] = useState({ status: '5xx', region: 'eu-west-1', by: 'Claude' });
  const [narrow, setNarrow] = useState({ q: '', status: '5xx', method: 'all' });
  return (
    <>
      <Specimen label="At rest" note="Search, filters and the view in one row. A filter's name stays in its control." stack>
        <FilterBar
          search={{ value: q, onChange: setQ, placeholder: 'Search requests' }}
          filters={[
            { key: 'status', label: 'Status', value: status, onChange: setStatus, options: opts(['2xx', '4xx', '5xx']) },
            { key: 'method', label: 'Method', value: method, onChange: setMethod, options: opts(['GET', 'POST', 'PUT', 'DELETE']) },
          ]}
          view={<Segmented size="sm" label="View" value={view} onChange={setView} options={[{ value: 'table', label: 'Table' }, { value: 'chart', label: 'Chart' }]} />}
          result="240 requests"
          onClear={() => { setQ(''); setStatus('all'); setMethod('all'); }}
        />
      </Specimen>
      <Specimen label="Set by an agent" note="Filters an assistant chose carry its mark until a person changes them. Clear returns every filter to All." stack>
        <FilterBar
          search={{ value: '', onChange: () => {}, placeholder: 'Search requests' }}
          filters={[
            { key: 'status', label: 'Status', value: agent.status, onChange: (s) => setAgent((a) => ({ ...a, status: s, by: '' })), options: opts(['2xx', '4xx', '5xx']) },
            { key: 'region', label: 'Region', value: agent.region, onChange: (r) => setAgent((a) => ({ ...a, region: r, by: '' })), options: opts(['us-east-1', 'eu-west-1', 'ap-southeast-1']) },
          ]}
          result="5 of 240"
          setBy={agent.by || undefined}
          onClear={() => setAgent({ status: 'all', region: 'all', by: '' })}
        />
      </Specimen>
      <Specimen label="Narrow" note="Under 52rem of its own width the search takes the row and the filters move behind one Filters button with a count, opening a sheet. Here, at a phone's 360px." stack>
        <div className="w-full max-w-[360px]">
          <FilterBar
            search={{ value: narrow.q, onChange: (q2) => setNarrow((n) => ({ ...n, q: q2 })), placeholder: 'Search requests' }}
            filters={[
              { key: 'status', label: 'Status', value: narrow.status, onChange: (v) => setNarrow((n) => ({ ...n, status: v })), options: opts(['2xx', '4xx', '5xx']) },
              { key: 'method', label: 'Method', value: narrow.method, onChange: (v) => setNarrow((n) => ({ ...n, method: v })), options: opts(['GET', 'POST', 'PUT', 'DELETE']) },
            ]}
            result="12 requests"
            onClear={() => setNarrow({ q: '', status: 'all', method: 'all' })}
          />
        </div>
      </Specimen>
    </>
  );
}
