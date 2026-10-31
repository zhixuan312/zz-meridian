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
    expect(sentence.childNodes).toHaveLength(0);
  });
});

describe('a sentence that opens with the page\'s own name', () => {
  // "Lumen Studio : Lumen Studio: past due" — the name, the colon and then the sentence saying the name again, in the heading and
  // in a screen reader's list of headings. The name stays in the markup, hidden from assistive technology (#88).
  it('is announced once, and the name is still in the markup', () => {
    render(<PageFrame name="Lumen Studio" title="Lumen Studio: past due since 03 Oct 2026">body</PageFrame>);
    const [name, colon, sentence] = [...h1().children];
    expect(name.textContent).toBe('Lumen Studio');
    expect(colon.getAttribute('aria-hidden')).toBe('true');
    expect(name.getAttribute('aria-hidden')).toBe('true');
    expect(sentence.getAttribute('aria-hidden')).toBeNull();
    expect(h1().textContent).toBe('Lumen Studio: Lumen Studio: past due since 03 Oct 2026');
  });

  it('reads the name beside a sentence that only begins with the same letters', () => {
    render(<PageFrame name="Members" title="Membership revenue: $12,480 this period">body</PageFrame>);
    expect([...h1().children][0].getAttribute('aria-hidden')).toBeNull();
  });

  it('takes the page\'s word for a sentence it cannot read, and holds the name while the sentence is still to come', () => {
    // A sentence that is a node — a part that reads data — cannot be compared with the name before it arrives, so the
    // page says so. Without the prop the name is read, which is the safe default.
    const spoken = render(<PageFrame name="Lumen Studio" title={<span>Lumen Studio: past due</span>} speaksName>body</PageFrame>);
    const [name] = [...h1().children];
    expect(name.getAttribute('aria-hidden')).toBe('true');
    spoken.unmount();
    // A sentence that has not arrived cannot be compared with the name, so the name is what the heading says.
    render(<PageFrame name="Lumen Studio">body</PageFrame>);
    expect([...h1().children][0].getAttribute('aria-hidden')).toBeNull();
  });
});

describe('a page headed by its name', () => {
  it('draws the title at the page-title size, and the same title in the top bar', () => {
    const { container } = render(<PageFrame title="Members">body</PageFrame>);
    expect(h1().textContent).toBe('Members');
    expect(h1().children).toHaveLength(0);
    expect(container.querySelector('p[aria-hidden]')!.textContent).toBe('Members');
  });
});
