import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Busy, ChartSkeleton, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';

const ROOT = path.resolve(import.meta.dirname, '..');
const CARD = 'src/components/patterns/page-loading';
/** The skeleton lines an element draws: each is a span hidden from assistive technology. */
const lines = (el: ReactElement) => render(el).container.querySelectorAll('span[aria-hidden="true"]').length;

/** Every file under `dir`, as a path from the repository root; nothing when the folder is not there. */
function walk(dir: string): string[] {
  if (!fs.existsSync(path.join(ROOT, dir))) return [];
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
}

describe('a page on its way', () => {
  it('is announced once as busy under its own name, with its heading already there', () => {
    render(<LoadingPage name="customers" title="Customers"><p>The body</p></LoadingPage>);
    const status = screen.getByRole('status');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toBe('Loading customers');
    expect(status.textContent).toContain('The body');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Customers');
  });

  it('announces a body that streams under a masthead that is already real', () => {
    render(<Busy name="requests"><p>The body</p></Busy>);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toBe('Loading requests');
    expect(status.textContent).toBe('The body');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});

describe('the shapes a loading page is composed from', () => {
  it('draws three tiles unless told how many the page has', () => {
    const tiles = (el: ReactElement) => render(el).container.querySelector('[data-split="tiles"]')!.children.length;
    expect(tiles(<TilesSkeleton />)).toBe(3);
    expect(tiles(<TilesSkeleton count={2} />)).toBe(2);
    expect(tiles(<TilesSkeleton count={4} />)).toBe(4);
  });

  it('draws a table one line per row, under a filter row of three unless the table has none', () => {
    expect(lines(<TableSkeleton rows={8} filters={false} />) - lines(<TableSkeleton rows={5} filters={false} />)).toBe(3);
    expect(lines(<TableSkeleton rows={5} />) - lines(<TableSkeleton rows={5} filters={false} />)).toBe(3);
    expect(lines(<TableSkeleton rows={5} filters />)).toBe(lines(<TableSkeleton rows={5} />));
  });

  it('draws a chart as a card of lines', () => {
    expect(lines(<ChartSkeleton />)).toBeGreaterThan(0);
  });
});

describe('where the loading states come from', () => {
  it('is the card: every route that has a loading state frames it with the card, and no team-owned helper is left', () => {
    for (const f of walk('app').filter((p) => /(^|\/)loading\.tsx$/.test(p))) {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).toMatch(/import \{[^}]*\bLoadingPage\b[^}]*\} from '@\/components\/patterns\/page-loading'/);
    }
    for (const f of [...walk('app'), ...walk('src')].filter((p) => /\.tsx?$/.test(p))) {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).not.toMatch(/\/_loading'/);
    }
    expect(walk('app').filter((p) => /(^|\/)_loading\.tsx$/.test(p))).toEqual([]);
  });

  it('knows nothing of the product: the card imports no data, view, system or config module', () => {
    const files = fs.readdirSync(path.join(ROOT, CARD)).filter((f) => /\.tsx?$/.test(f) && f !== 'preview.tsx');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(fs.readFileSync(path.join(ROOT, CARD, f), 'utf8'), f).not.toMatch(/from '@\/(data|views|system|app\.config)/);
  });
});
