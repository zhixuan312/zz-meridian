import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CopyField } from '@/components/ui/copy-field';
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

/**
 * The same rule in the two other components that cut a string of their own: found by the audit's first pass over the
 * Atlas, where a breadcrumb's page read "POST /v1/documents/:id/attachm…" and a copy field's address ended in an ellipsis.
 */
describe('a breadcrumb and a copy field', () => {
  it('a crumb the trail cuts carries its whole label, link or not', () => {
    const { container } = render(<Breadcrumb items={[{ label: 'Requests', href: '/requests' }, { label: 'Northwind Trading' }, { label: 'POST /v1/documents/:id/attachments' }]} />);
    const cut = [...container.querySelectorAll('.truncate')];
    expect(cut.map((el) => el.getAttribute('title'))).toEqual(['Requests', 'Northwind Trading', 'POST /v1/documents/:id/attachments']);
  });

  it('a copy field titles what it shows: the value, and for a masked secret the mask and never the secret', () => {
    const address = render(<CopyField label="Endpoint" value="https://api.zz-meridian.example/v1/messages" />).container.querySelector('code')!;
    expect(address.getAttribute('title')).toBe('https://api.zz-meridian.example/v1/messages');
    const key = render(<CopyField label="API key" secret value="zzm_live_7Hc2x9a3m4cQ91" />).container.querySelector('code')!;
    expect(key.getAttribute('title')).toBe(key.textContent);
    expect(key.getAttribute('title')).not.toContain('7Hc2x9a3m4c');
  });
});
