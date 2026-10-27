// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A forced palette (Windows' contrast themes, and any browser told to force colours) replaces every colour with a few
 * of the system's own and drops box-shadow, so a fill, a tint and a ring are gone. A component that tells which item is
 * chosen by them alone tells nothing there: the rail's current page, the chosen segment of a Segmented, the period, a
 * chosen radio and the accent swatches all read the same as the rest. base.css tells each selection state in the
 * system's Highlight, outside every layer so a utility's fill cannot win, and keeps a swatch's own colour, which is what
 * it shows. Every state a component styles a choice by must be one that block names.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'src/styles/base.css'), 'utf8');
const forced = /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

function components(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? components(p) : e.name === 'index.tsx' ? [p] : [];
  });
}

/** The selection states a class list styles: `aria-pressed:`, `aria-[current=page]:`, `[&_a[aria-current=page]]:`, `data-[state=on]:` and the like. */
const STATES: [RegExp, string][] = [
  // The attribute itself counts too: a pager or an icon button styles its choice by a condition beside `aria-current={…}`.
  [/aria-current=page|aria-\[current=page\]|aria-current=\{/, "[aria-current='page']"],
  [/aria-pressed:|aria-\[pressed=true\]|aria-pressed=\{/, "[aria-pressed='true']"],
  [/aria-selected:|aria-\[selected=true\]|aria-selected=\{/, "[aria-selected='true']"],
  [/aria-checked:|aria-\[checked=true\]|aria-checked=\{/, "[aria-checked='true']"],
  [/data-\[state=on\]/, "[data-state='on']"],
  [/data-\[state=active\]/, "[data-state='active']"],
  [/data-\[state=checked\]/, "[data-state='checked']"],
  // Focus too: a field that removes its outline tells focus by its border and a ring, and a menu its highlighted item by
  // a fill, both gone in a forced palette, so a keyboard reader loses where they are.
  [/outline-none|outline-hidden/, ':focus-visible'],
  [/data-highlighted:/, '[data-highlighted]'],
];

describe('a chosen item is told apart under forced colours', () => {
  it('base.css has the block, outside every layer', () => {
    expect(forced, 'no @media (forced-colors: active) block at the top level of base.css').not.toBe('');
    expect(forced).toMatch(/Highlight/);
    expect(forced).toMatch(/forced-color-adjust:\s*none/);
    // A swatch is marked as one: `data-accent` alone is also on <html>, and would take the whole page out of the palette.
    expect(forced, 'a swatch keeps its own colour').toMatch(/\[data-swatch\]/);
    expect(forced).not.toMatch(/\[data-accent\]/);
    // A tab's panel carries the state its tab does, and is content, not a choice.
    expect(forced).toContain(":not([role='tabpanel'])");
    expect(forced, "a switch's thumb is drawn").toContain("[role='switch'] > *");
  });

  for (const file of components(path.join(ROOT, 'src/components'))) {
    const source = fs.readFileSync(file, 'utf8');
    const used = STATES.filter(([styled]) => styled.test(source));
    if (!used.length) continue;
    it(path.relative(ROOT, file), () => {
      for (const [, selector] of used) expect(forced, `${selector} is styled here and not told under forced colours`).toContain(selector);
    });
  }
});
