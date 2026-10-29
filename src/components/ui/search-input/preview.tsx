'use client';

import { useState } from 'react';
import { Specimen, State } from '@/system/specimen';
import { SearchInput } from '.';

export default function SearchInputPreview() {
  const [a, setA] = useState('');
  const [b, setB] = useState('parallax');
  return (
    <>
      <Specimen label="Empty" note="The shortcut shows until there is text; press / to focus." stack>
        <SearchInput aria-label="Search requests" placeholder="Search requests" value={a} onValueChange={setA} shortcut="/" className="max-w-96" />
      </Specimen>
      <Specimen label="Filled" note="A clear button replaces the hint; Escape clears too." stack>
        <SearchInput aria-label="Search customers" value={b} onValueChange={setB} className="max-w-96" />
      </Specimen>
      <Specimen label="Sizes" stack>
        <div className="grid w-full max-w-160 items-end gap-3 sm:grid-cols-2">
          <State label="Small"><Sized size="sm" /></State>
          <State label="Medium"><Sized size="md" /></State>
        </div>
      </Specimen>
    </>
  );
}

/** One size, live: it takes what is typed, as it does on a page. */
function Sized({ size }: { size: 'sm' | 'md' }) {
  const [value, setValue] = useState('');
  return <SearchInput size={size} aria-label={size === 'sm' ? 'Small' : 'Medium'} value={value} onValueChange={setValue} placeholder="Filter" />;
}
