import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Busy, ChartSkeleton, LeadRoom, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';

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

  it('holds the block of a sentence when its page is headed by one: the name is announced, the placeholder is drawn, and nothing is set at the page-title size', () => {
    const { container } = render(<LoadingPage name="home" title="Home" sentence><p>The body</p></LoadingPage>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const heading = screen.getByRole('heading', { level: 1 });
    // The name and its colon are in the heading for assistive technology, and neither is drawn.
    expect(heading.textContent).toBe('Home: ');
    const [name, colon, pending] = [...heading.children];
    expect([name.textContent, colon.textContent]).toEqual(['Home', ': ']);
    expect(name.className).toMatch(/\bsr-only\b/);
    expect(colon.className).toMatch(/\bsr-only\b/);
    // What is drawn is the placeholder, in the block the sentence will take, hidden from assistive technology.
    expect(pending.hasAttribute('data-title-pending')).toBe(true);
    expect(pending.getAttribute('aria-hidden')).toBe('true');
    expect(pending.className).toMatch(/\bt-section\b/);
    expect(pending.className).toMatch(/\bmin-h-\[/);
    // No heading at the page-title size: the heading is not one, and the name carries the role only for a title that came to nothing.
    expect(heading.className).not.toMatch(/\bt-page\b/);
    expect([...heading.querySelectorAll('.t-page')].filter((el) => !/\bsr-only\b/.test(el.className))).toEqual([]);
    // The top bar still has the name, and the page is still announced once as busy.
    expect(container.querySelector('p[aria-hidden]')!.textContent).toBe('Home');
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading home');
  });

  it('draws a name at the page-title size unless it is told the page is headed by a sentence, and a skeleton when it has no name to say', () => {
    render(<LoadingPage name="customers" title="Customers"><p>The body</p></LoadingPage>);
    expect(screen.getByRole('heading', { level: 1 }).className).toBe('t-page');
    expect(screen.getByRole('heading', { level: 1 }).querySelector('[data-title-pending]')).toBeNull();
    cleanup();
    // `sentence` with no title has no name to keep in the heading, so the frame is as a page with no title draws it.
    render(<LoadingPage name="request" sentence><p>The body</p></LoadingPage>);
    expect(screen.getByRole('heading', { level: 1 }).className).toBe('t-page');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('');
  });

  it('holds the masthead its page will have: the kicker, the room of a long sentence, the freshness and where the actions stand', () => {
    const { container } = render(
      <LoadingPage name="home" title="Home" sentence kicker="ZZ Meridian · Production" lead meta={<span>Updated 4 min ago</span>} actions={<span data-actions-room>Period and Export</span>}>
        <p>The body</p>
      </LoadingPage>,
    );
    const masthead = container.querySelector('header')!;
    expect(masthead.querySelector('.t-kicker')!.textContent).toBe('ZZ Meridian · Production');
    // The sentence's room is the one a page keeps around its own sentence: at least three lines of the lead, more as its column narrows.
    const room = masthead.querySelector('[data-lead-room]')!;
    expect(room.closest('.t-lead')).toBeTruthy();
    expect(room.firstElementChild!.className).toMatch(/\bmin-h-\[6lh\]/);
    expect(room.firstElementChild!.className).toMatch(/@min-\[34em\]:min-h-\[3lh\]/);
    expect(room.querySelectorAll('span[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(masthead.textContent).toContain('Updated 4 min ago');
    expect(masthead.querySelector('[data-actions-room]')).toBeTruthy();
    // Without them the frame keeps its skeleton kicker, one bar of description and no actions, as before.
    cleanup();
    const bare = render(<LoadingPage name="customers" title="Customers"><p>The body</p></LoadingPage>).container.querySelector('header')!;
    expect(bare.querySelector('[data-lead-room]')).toBeNull();
    expect(bare.querySelector('.t-kicker')!.textContent).toBe('');
  });

  it('keeps the same room around the sentence a page draws, so its arrival moves nothing', () => {
    const empty = render(<p className="t-lead"><LeadRoom /></p>).container.querySelector('[data-lead-room]')!;
    cleanup();
    const full = render(<p className="t-lead"><LeadRoom>320 customers, and Inference API is degraded.</LeadRoom></p>).container.querySelector('[data-lead-room]')!;
    expect(full.firstElementChild!.className).toBe(empty.firstElementChild!.className);
    expect(full.textContent).toBe('320 customers, and Inference API is degraded.');
    expect(full.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('keeps its placeholder\'s margins inside the room, so the room is as tall empty as full', () => {
    // A bar's vertical margin that escapes the room is added to the row the sentence stands in: the loading state's
    // masthead was 7px taller than the page's. The room holds its own block formatting context, so nothing escapes it.
    const room = render(<p className="t-lead"><LeadRoom /></p>).container.querySelector('[data-lead-room]')!.firstElementChild!;
    expect(room.className).toMatch(/(^|\s)flow-root(\s|$)/);
    expect(room.className).not.toMatch(/(^|\s)block(\s|$)/);
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
