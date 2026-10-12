import { Children, type ReactNode } from 'react';
import { Row, Stack } from '@/components/base/shell';

/**
 * The arrangement of a page that lists records: an optional row of summary tiles over the records themselves
 * (a Data table with its Filter bar). It keeps no state and reads no data; the page supplies both. Each item of
 * `summary` is a direct child of the tiles row, which sizes its columns by counting them.
 */
export function Records({ summary, children }: { /** The summary tiles: one node, or an array whose items become the row's direct children. */ summary?: ReactNode; children: ReactNode }) {
  const tiles = Children.toArray(summary);
  return (
    <Stack data-template="records">
      {tiles.length ? <Row split="tiles">{tiles}</Row> : null}
      {children}
    </Stack>
  );
}
