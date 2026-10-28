// Named cli-* so the payload leaves it out: it reads the Bar list's own preview and README, which a product may not keep.
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { createElement, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/charts/use-size', async () => {
  const { useRef } = await import('react');
  return { useSize: () => [useRef(null), { width: 600, height: 0 }] as const };
});
// Every Bar list the preview draws is drawn as itself, and its props are kept to be read.
const drawn = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock('@/components/charts/bar-list', async (actual) => {
  const m = await actual<typeof import('@/components/charts/bar-list')>();
  return { ...m, BarList: (p: ComponentProps<typeof m.BarList>) => (drawn.push(p), createElement(m.BarList, p)) };
});

import BarListPreview from '@/components/charts/bar-list/preview';

// I-14 findings 1 and 4: an accented row says why it is the accent, in every specimen and in the README's example, and
// the README names the axis levels as the standard draws them.

const README = fs.readFileSync(path.join(import.meta.dirname, '../src/components/charts/bar-list/README.md'), 'utf8');

describe('the Bar list\'s preview and README', () => {
  it('give every highlighted list its highlightLabel', () => {
    render(<BarListPreview />);
    const highlighted = drawn.filter((p) => p.highlight);
    expect(highlighted.length).toBeGreaterThan(0);
    for (const p of highlighted) expect(p.highlightLabel, `${p.label}`).toEqual(expect.stringMatching(/\S/));
  });

  it('pass highlightLabel wherever an example passes highlight', () => {
    const examples = [...README.matchAll(/<BarList\b[^>]*\/>/g)].map((m) => m[0]).filter((e) => /\bhighlight=/.test(e));
    expect(examples.length).toBeGreaterThan(0);
    for (const e of examples) expect(e).toMatch(/\bhighlightLabel="[^"]+"/);
  });

  it('name the axis levels at text-2xs in ink-3', () => {
    expect(README).toMatch(/\*\*Axis\*\*[^\n]*`text-2xs` in `ink-3`/);
  });
});
