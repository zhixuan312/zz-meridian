'use client';

import { useState } from 'react';
import { Specimen, State } from '@/system/specimen';
import { SearchInput } from '@/components/ui/search-input';
import { MEMBERS } from '@/system/fixtures/sample-members';
import { Pagination, usePaged } from '.';

/** A roster inside a card: not a data table, paged by usePaged; the search resets it to page 1. */
function Roster() {
  const [q, setQ] = useState('');
  const matching = MEMBERS.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const { rows, paged, pagination } = usePaged(matching, { pageSize: 5, resetKey: q });
  return (
    <div className="w-full max-w-md rounded-lg border border-line bg-surface">
      <div className="p-3"><SearchInput value={q} onValueChange={setQ} placeholder="Search members" aria-label="Search members" /></div>
      <ul className="border-t border-line">
        {rows.map((m) => <li key={m.id} className="border-b border-line px-4 py-2.5 text-sm last:border-0">{m.name}</li>)}
        {rows.length === 0 ? <li className="px-4 py-2.5 text-sm text-ink-3">No member matches “{q}”.</li> : null}
      </ul>
      {paged ? <div className="border-t border-line px-3 py-2"><Pagination {...pagination} noun="members" /></div> : null}
    </div>
  );
}

export default function PaginationPreview() {
  const [page, setPage] = useState(2);
  const [size, setSize] = useState(20);
  return (
    <>
      <Specimen label="Default" note="The range, then the pages; one either side of the current page." stack>
        <Pagination page={page} pageSize={size} total={240} noun="requests" onPageChange={setPage} pageSizes={[10, 20, 50]} onPageSizeChange={(s) => { setSize(s); setPage(1); }} />
      </Specimen>
      <Specimen label="Positions" stack>
        <State label="First page" className="w-full"><Pager start={1} total={240} noun="requests" /></State>
        <State label="Middle" className="w-full"><Pager start={6} total={240} noun="requests" /></State>
        <State label="Last page" className="w-full"><Pager start={12} total={240} noun="requests" /></State>
        <State label="One page" className="w-full"><Pager start={1} total={7} noun="customers" /></State>
      </Specimen>
      <Specimen label="A list that is not a table" note="usePaged pages any rows; searching lands on page 1, and the pager hides when one page holds them all." stack>
        <Roster />
      </Specimen>
    </>
  );
}

/** A pager that starts at one position and moves when pressed, so a position specimen is not a dead control. */
function Pager({ start, total, noun }: { start: number; total: number; noun: string }) {
  const [page, setPage] = useState(start);
  return <Pagination page={page} pageSize={20} total={total} noun={noun} onPageChange={setPage} className="w-full" />;
}
