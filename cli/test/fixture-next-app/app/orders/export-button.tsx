'use client';

import { Button } from '@/components/ui/button';

/** The fixture's own control: an Export writes a file, which is its answer — nothing in the page changes when it works. */
export function ExportButton() {
  return (
    <Button
      type="button"
      className="min-h-11"
      onClick={() => {
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,customer%2Ctotal%0Aacme%2C120%0A';
        a.download = 'orders.csv';
        a.click();
      }}
    >
      Export
    </Button>
  );
}
