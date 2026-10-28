import { render, screen } from '@testing-library/react';
import { PassThrough } from 'node:stream';
import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageFrame } from '@/components/base/shell';

/**
 * A page's heading may be a sentence that states its figures. The page's name stays in the heading, read out and not
 * drawn, so a screen reader's list of headings, the top bar and whatever finds a page by its heading still have it.
 */
const SENTENCE = 'The highest 30 days yet: $3,300,438.74, the 3rd record in a row';
const h1 = () => screen.getByRole('heading', { level: 1 });

/** The heading as the server sends it: at once (`shell`), with whatever has not arrived as its fallback, or once all of it has. */
const sent = (page: ReactElement, when: 'shell' | 'all') =>
  new Promise<Element>((resolve, reject) => {
    const out = new PassThrough();
    let html = '';
    out.on('data', (chunk) => { html += chunk; });
    const done = () => resolve(new DOMParser().parseFromString(html, 'text/html').querySelector('h1')!);
    const stream = renderToPipeableStream(page, {
      onShellReady: () => { if (when === 'shell') { stream.pipe(out); setTimeout(() => { stream.abort(); done(); }, 50); } },
      onAllReady: () => { if (when === 'all') { out.on('end', done); stream.pipe(out); } },
      onShellError: reject,
      onError: () => {},
    });
  });

describe('a page headed by a sentence', () => {
  it('reads its name, then the sentence, in one heading, and shows the name in the top bar', () => {
    const { container } = render(<PageFrame name="Home" title={SENTENCE}>body</PageFrame>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(h1().textContent).toBe(`Home: ${SENTENCE}`);
    // The name and the colon after it are out of sight; the sentence is the one thing drawn, in the section role.
    const [name, colon, sentence] = [...h1().children];
    expect([name.textContent, colon.textContent, sentence.textContent]).toEqual(['Home', ': ', SENTENCE]);
    expect(name.className).toMatch(/\bsr-only\b/);
    expect(colon.className).toMatch(/\bsr-only\b/);
    expect(sentence.className).toMatch(/\bt-section\b/);
    expect(sentence.className).toMatch(/\btext-balance\b/);
    expect(sentence.className).not.toMatch(/\bsr-only\b/);
    // The compact title that fades into the top bar is the name, never the sentence.
    expect(container.querySelector('p[aria-hidden]')!.textContent).toBe('Home');
  });

  it('holds the sentence\'s block with a placeholder until the sentence arrives, with the name already in the heading', async () => {
    // A title that reads data is a part of its own: the server sends the heading at once, and the sentence when it has it.
    const never = new Promise<never>(() => {});
    async function Waits() { return never; }
    async function Arrives() { return SENTENCE; }
    const waiting = await sent(<PageFrame name="Home" title={<Waits />}>body</PageFrame>, 'shell');
    const pending = waiting.querySelector('[data-title-pending]')!;
    expect(pending.getAttribute('aria-hidden')).toBe('true');
    expect(waiting.textContent).toBe('Home: ');
    expect(waiting.querySelector('[data-title]')).toBeNull();
    const arrived = await sent(<PageFrame name="Home" title={<Arrives />}>body</PageFrame>, 'all');
    expect(arrived.querySelector('[data-title-pending]')).toBeNull();
    expect(arrived.textContent).toBe(`Home: ${SENTENCE}`);
    // The placeholder and the sentence are the same block: the same role and the same room for its lines.
    const block = (el: Element) => el.className.split(/\s+/).filter((c) => /^(t-section|min-h-|@min-)/.test(c)).sort();
    expect(block(arrived.querySelector('[data-title]')!)).toEqual(block(pending));
    expect(block(pending).length).toBeGreaterThan(1);
  });

  it('draws the placeholder for a loading state, which passes the name alone', () => {
    render(<PageFrame name="Usage">body</PageFrame>);
    expect(h1().textContent).toBe('Usage: ');
    expect(h1().querySelector('[data-title-pending]')).not.toBeNull();
    expect(h1().querySelector('[data-title]')).toBeNull();
  });

  it('is headed by its name when the sentence came to nothing', () => {
    render(<PageFrame name="Revenue" title={null}>body</PageFrame>);
    const [name, , sentence] = [...h1().children];
    expect(name.textContent).toBe('Revenue');
    // Nothing follows the name, so the name is what is drawn, at the page-title size: the rule is the name's own.
    expect(sentence.childNodes).toHaveLength(0);
    expect(sentence.className).toMatch(/\bempty:hidden\b/);
    expect(name.className).toMatch(/\bt-page\b/);
    expect(name.className).toMatch(/has-\[~\[data-title\]:empty\]:not-sr-only/);
  });
});

describe('a sentence that opens with the page\'s own name', () => {
  // "USDC : USDC: no rule met" — the name, the colon and then the sentence saying the name again, in the heading and
  // in a screen reader's list of headings. The name stays in the markup, hidden from assistive technology (#88).
  it('is announced once, and the name is still in the markup', () => {
    render(<PageFrame name="USDC" title="USDC: no rule met, price from par inside its band">body</PageFrame>);
    const [name, colon, sentence] = [...h1().children];
    expect(name.textContent).toBe('USDC');
    expect(colon.getAttribute('aria-hidden')).toBe('true');
    expect(name.getAttribute('aria-hidden')).toBe('true');
    expect(sentence.getAttribute('aria-hidden')).toBeNull();
    expect(h1().textContent).toBe('USDC: USDC: no rule met, price from par inside its band');
  });

  it('reads the name beside a sentence that only begins with the same letters', () => {
    render(<PageFrame name="Members" title="Membership revenue: $12,480 this period">body</PageFrame>);
    expect([...h1().children][0].getAttribute('aria-hidden')).toBeNull();
  });

  it('takes the page\'s word for a sentence it cannot read, and holds the name while the sentence is still to come', () => {
    // A sentence that is a node — a part that reads data — cannot be compared with the name before it arrives, so the
    // page says so. Without the prop the name is read, which is the safe default.
    const spoken = render(<PageFrame name="USDC" title={<span>USDC: no rule met</span>} speaksName>body</PageFrame>);
    const [name] = [...h1().children];
    expect(name.getAttribute('aria-hidden')).toBe('true');
    spoken.unmount();
    // A sentence that has not arrived cannot be compared with the name, so the name is what the heading says.
    render(<PageFrame name="USDC">body</PageFrame>);
    expect([...h1().children][0].getAttribute('aria-hidden')).toBeNull();
  });
});

describe('the masthead of a page headed by a sentence', () => {
  const kicker = <span data-testid="kicker">ZZ Meridian · Production</span>;
  const meta = <span data-testid="meta">Updated 4 min ago</span>;
  const actions = <button data-testid="actions">Export</button>;
  const within = (el: Element | null, id: string) => el?.querySelector(`[data-testid="${id}"]`) ?? null;

  it('gives the kicker and the heading a row of their own, and the description, the meta and the actions the next', () => {
    render(<PageFrame name="Home" title={SENTENCE} kicker={kicker} description="What the page answers." meta={meta} actions={actions}>body</PageFrame>);
    // The heading's width must not depend on what stands beside the description: the room its block keeps is read from it.
    const row = h1().parentElement!;
    expect(within(row, 'kicker')).not.toBeNull();
    expect(within(row, 'meta')).toBeNull();
    expect(within(row, 'actions')).toBeNull();
    expect(row.textContent).not.toContain('What the page answers.');
    expect([...row.children].map((el) => el.tagName)).toEqual(['DIV', 'H1']);
    // It is a block of the masthead's whole width, not an item of a row that shares it.
    expect(row.parentElement!.tagName).toBe('HEADER');
    expect(row.className).not.toMatch(/\bflex\b|\bbasis-/);
    const next = row.nextElementSibling!;
    expect(next.textContent).toContain('What the page answers.');
    expect(within(next, 'meta')).not.toBeNull();
    expect(within(next, 'actions')).not.toBeNull();
    // The description is the item that grows, so the meta and the actions stand at the row's end, on its last line.
    expect(next.className).toMatch(/\bflex\b/);
    expect(next.className).toMatch(/\bitems-end\b/);
    expect(next.firstElementChild!.className).toMatch(/\bflex-1\b/);
    expect(next.firstElementChild!.textContent).toBe('What the page answers.');
    expect(next.className).toMatch(/\bmt-3\b/);
  });

  it('leaves no empty item where there is no description: the meta and the actions stand at the row\'s start', () => {
    render(<PageFrame name="Northwind Labs" title={SENTENCE} kicker={kicker} meta={meta} actions={actions}>body</PageFrame>);
    const next = h1().parentElement!.nextElementSibling!;
    expect(next.children).toHaveLength(1);
    expect(within(next.firstElementChild, 'meta')).not.toBeNull();
    expect(within(next.firstElementChild, 'actions')).not.toBeNull();
    for (const el of [next, ...next.querySelectorAll('*')]) expect(el.textContent, el.outerHTML).not.toBe('');
    expect(next.querySelector('.flex-1')).toBeNull();
    expect(next.className).toMatch(/\bmt-5\b/);
  });

  it('has no second row with nothing to hold, and keeps the toolbar under the masthead', () => {
    const { container, unmount } = render(<PageFrame name="Home" title={SENTENCE} kicker={kicker}>body</PageFrame>);
    expect([...container.querySelector('header')!.children]).toEqual([h1().parentElement]);
    unmount();
    render(<PageFrame name="Home" title={SENTENCE} description="What the page answers." toolbar={<nav data-testid="toolbar" />}>body</PageFrame>);
    const [heading, second, toolbar] = [...document.querySelector('header')!.children];
    expect(heading).toBe(h1().parentElement);
    expect(second.children).toHaveLength(1);
    expect(within(toolbar, 'toolbar')).not.toBeNull();
  });

  it('is the same for a loading state, which passes the name alone: the placeholder\'s row holds nothing else', () => {
    render(<PageFrame name="Home" kicker={kicker} description="A skeleton line">body</PageFrame>);
    const row = h1().parentElement!;
    expect(h1().querySelector('[data-title-pending]')).not.toBeNull();
    expect([...row.children].map((el) => el.tagName)).toEqual(['DIV', 'H1']);
    expect(row.nextElementSibling!.textContent).toBe('A skeleton line');
  });

  it('is as it always was for a page headed by its name: the title, the description, the meta and the actions share one row', () => {
    render(<PageFrame title="Members" kicker={kicker} description="Everyone in the workspace." meta={meta} actions={actions}>body</PageFrame>);
    const column = h1().parentElement!;
    expect(column.className).toBe('min-w-0 flex-1 basis-[28rem]');
    expect([...column.children].map((el) => el.tagName)).toEqual(['DIV', 'H1', 'P']);
    expect(column.lastElementChild!.className).toBe('t-lead mt-3 max-w-[60ch]');
    const row = column.parentElement!;
    expect(row.className).toBe('flex flex-wrap items-end gap-x-8 gap-y-5');
    expect(within(row, 'meta')).not.toBeNull();
    expect(within(row, 'actions')).not.toBeNull();
    expect(row.parentElement!.tagName).toBe('HEADER');
    expect(row.parentElement!.children).toHaveLength(1);
  });
});

describe('a page headed by its name', () => {
  it('is drawn as it always was: the title at the page-title size, and the same title in the top bar', () => {
    const { container } = render(<PageFrame title="Members">body</PageFrame>);
    expect(h1().textContent).toBe('Members');
    expect(h1().className).toBe('t-page');
    expect(h1().children).toHaveLength(0);
    expect(container.querySelector('p[aria-hidden]')!.textContent).toBe('Members');
  });
});
