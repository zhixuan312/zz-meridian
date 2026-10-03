'use client';

import { useState } from 'react';
import { Specimen, State } from '@/system/specimen';
import { Pagination } from '.';

export default function PaginationPreview() {
  const [page, setPage] = useState(2);
  const [size, setSize] = useState(20);
  return (
    <>
      <Specimen label="Default" note="The range, then the pages; one either side of the current page." stack>
        <Pagination page={page} pageSize={size} total={240} noun="requests" onPageChange={setPage} pageSizes={[10, 20, 50]} onPageSizeChange={(s) => { setSize(s); setPage(1); }} />
      </Specimen>
      <Specimen label="Positions" stack>
        <State label="First page" className="w-full"><Pagination page={1} pageSize={20} total={240} noun="requests" onPageChange={() => {}} className="w-full" /></State>
        <State label="Middle" className="w-full"><Pagination page={6} pageSize={20} total={240} noun="requests" onPageChange={() => {}} className="w-full" /></State>
        <State label="Last page" className="w-full"><Pagination page={12} pageSize={20} total={240} noun="requests" onPageChange={() => {}} className="w-full" /></State>
        <State label="One page" className="w-full"><Pagination page={1} pageSize={20} total={7} noun="customers" onPageChange={() => {}} className="w-full" /></State>
      </Specimen>
    </>
  );
}
