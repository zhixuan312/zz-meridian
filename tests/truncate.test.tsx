import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/** A truncated cell keeps the whole value: `truncate` cuts what is drawn, never what can be read. */
describe('a truncated cell', () => {
  const td = (node: ReactNode) =>
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell truncate>{node}</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    ).container.querySelector('td')!;

  it('carries the full value in its title', () => {
    expect(td('/v1/messages/with/a/long/tail').getAttribute('title')).toBe('/v1/messages/with/a/long/tail');
    expect(td(612).getAttribute('title')).toBe('612');
  });

  it('leaves a cell its author crafted, and a title the caller passed wins', () => {
    expect(td(<span title="its own">a node</span>).getAttribute('title')).toBeNull();
    const own = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell truncate title="mine">
              /v1/messages
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    ).container.querySelector('td')!;
    expect(own.getAttribute('title')).toBe('mine');
  });

  it('adds nothing when the column does not truncate', () => {
    const plain = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>/v1/messages</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    ).container.querySelector('td')!;
    expect(plain.getAttribute('title')).toBeNull();
  });
});
