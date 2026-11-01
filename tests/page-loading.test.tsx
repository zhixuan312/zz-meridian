import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Busy, ChartSkeleton, LeadRoom, LoadingPage, TableSkeleton, TilesSkeleton } from '@/components/patterns/page-loading';
import { projectAliases } from '../scripts/lib/aliases.ts';
import { blankedText, resolveSpec, valueImports } from '../scripts/lib/layer-rules.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CARD = 'src/components/patterns/page-loading';
/** The skeleton lines an element draws: each is a span hidden from assistive technology. */
const lines = (el: ReactElement) => render(el).container.querySelectorAll('span[aria-hidden="true"]').length;
const productDependencies = (file: string, source: string, aliases: [string, string][], root: string) =>
  valueImports(blankedText(source))
    .map(({ spec }) => resolveSpec(file, spec, aliases, root))
    .filter((target) => target !== null && /^src\/(?:data|views|system)\/|^src\/app\.config\./.test(target));

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
    // What is drawn is the placeholder, in the block the sentence will take, hidden from assistive technology.
    expect(pending.hasAttribute('data-title-pending')).toBe(true);
    expect(pending.getAttribute('aria-hidden')).toBe('true');
    // The top bar still has the name, and the page is still announced once as busy.
    expect(container.querySelector('p[aria-hidden]')!.textContent).toBe('Home');
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading home');
  });

  it('draws a heading without a sentence placeholder unless asked for one, and keeps the heading text empty when the title is unknown', () => {
    render(<LoadingPage name="customers" title="Customers"><p>The body</p></LoadingPage>);
    expect(screen.getByRole('heading', { level: 1 }).querySelector('[data-title-pending]')).toBeNull();
    cleanup();
    // `sentence` with no title has no name to keep in the heading, so the frame is as a page with no title draws it.
    render(<LoadingPage name="request" sentence><p>The body</p></LoadingPage>);
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
    const room = masthead.querySelector('[data-lead-room]')!;
    expect(room.querySelectorAll('span[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(masthead.textContent).toContain('Updated 4 min ago');
    expect(masthead.querySelector('[data-actions-room]')).toBeTruthy();
    // Without them the frame keeps its skeleton kicker, one bar of description and no actions.
    cleanup();
    const bare = render(<LoadingPage name="customers" title="Customers"><p>The body</p></LoadingPage>).container.querySelector('header')!;
    expect(bare.querySelector('[data-lead-room]')).toBeNull();
    expect(bare.querySelector('.t-kicker')!.textContent).toBe('');
  });

  it('shows the sentence instead of its placeholder once it is given content', () => {
    const full = render(<p className="t-lead"><LeadRoom>320 customers, and Inference API is degraded.</LeadRoom></p>).container.querySelector('[data-lead-room]')!;
    expect(full.textContent).toBe('320 customers, and Inference API is degraded.');
    expect(full.querySelector('span[aria-hidden="true"]')).toBeNull();
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
  it('draws the number of tiles it is given', () => {
    const tiles = (el: ReactElement) => render(el).container.querySelector('[data-split="tiles"]')!.children.length;
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
  it('knows nothing of the product: the card imports no data, view, system or config module', () => {
    const files = fs.readdirSync(path.join(ROOT, CARD)).filter((f) => /\.tsx?$/.test(f) && f !== 'preview.tsx');
    expect(files.length).toBeGreaterThan(0);
    const aliases = projectAliases(ROOT);
    for (const f of files) {
      const file = `${CARD}/${f}`;
      expect(productDependencies(file, fs.readFileSync(path.join(ROOT, file), 'utf8'), aliases, ROOT), f).toEqual([]);
    }
  });

  it('rejects runtime-extension product imports without confusing toolkit, type or missing imports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-loading-imports-'));
    try {
      const files = ['src/data/orders.ts', 'src/views/orders.tsx', 'src/system/session.mts', 'src/app.config.cts', 'src/components/toolkit.ts'];
      for (const file of files) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), 'export const value = 1;');
      }
      const aliases: [string, string][] = [['@/', 'src/']];
      const file = 'src/components/patterns/page-loading/index.tsx';
      expect(productDependencies(file, [
        'import { value } from "@/data/orders.js";',
        'export { value as view } from "@/views/orders.jsx";',
        'import("@/system/session.mjs");',
        'import "@/app.config.cjs";',
      ].join('\n'), aliases, root)).toEqual(files.slice(0, 4));
      expect(productDependencies(file, [
        'import type { value } from "@/data/orders.js";',
        'import { type value } from "@/views/orders.jsx";',
        'import { value } from "../../toolkit.js";',
        'import "@/data/missing.js";',
      ].join('\n'), aliases, root)).toEqual([]);
      expect(resolveSpec(file, '../../toolkit.js', aliases, root)).toBe('src/components/toolkit.ts');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses TypeScript substitution order before runtime files, never a suffix after an explicit JavaScript extension', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-import-resolution-'));
    try {
      fs.mkdirSync(path.join(root, 'src'), { recursive: true });
      for (const file of ['module.ts', 'module.tsx', 'module.js', 'runtime.js', 'runtime.js.ts', 'esm.mts', 'esm.mjs', 'common.cts', 'common.cjs', 'types.d.ts', 'types.js', 'missing.js.ts']) {
        fs.writeFileSync(path.join(root, 'src', file), '');
      }
      const resolve = (spec: string) => resolveSpec('src/from.ts', spec, [], root);
      expect(resolve('./module.js')).toBe('src/module.ts');
      expect(resolve('./module.jsx')).toBe('src/module.tsx');
      expect(resolve('./runtime.js')).toBe('src/runtime.js');
      expect(resolve('./esm.mjs')).toBe('src/esm.mts');
      expect(resolve('./common.cjs')).toBe('src/common.cts');
      expect(resolve('./types.js')).toBe('src/types.d.ts');
      expect(resolve('./missing.js')).toBeNull();
      expect(resolve('./module')).toBe('src/module.ts');
      expect(resolve('./module.tsx')).toBe('src/module.tsx');
      expect(resolve('external-package')).toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
