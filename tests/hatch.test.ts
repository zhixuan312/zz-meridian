import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// FR-13 and FR-14 (AC-2.2): an estimate's hatch is one base role, and it stays under forced colours.

const css = fs.readFileSync(path.join(import.meta.dirname, '../src/styles/base.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The text between the brace that opens at `from` and the brace that closes it. */
function body(from: number): { start: number; end: number; text: string } {
  const open = css.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return { start: open, end: i, text: css.slice(open + 1, i) };
  }
  throw new Error(`no closing brace after ${from}`);
}
/** The declarations of the rule whose selector is exactly `[data-estimate]` in a block's text, or null. */
const rule = (text: string) => /(?:^|[}\s;])\[data-estimate\]\s*\{([^}]*)\}/.exec(text)?.[1] ?? null;
const layers = [...css.matchAll(/@layer\s+[\w-]+\s*\{/g)].map((m) => ({ name: m[0], ...body(m.index!) }));

describe('the hatch', () => {
  it('is a rule of the layered base: surface stripes at 135° over the mark\'s own fill', () => {
    const base = layers.find((l) => /@layer\s+base\b/.test(l.name));
    expect(base).toBeDefined();
    const hatch = rule(base!.text);
    expect(hatch, 'no [data-estimate] rule in @layer base').not.toBeNull();
    expect(hatch).toMatch(/background-image\s*:\s*repeating-linear-gradient\(\s*135deg/);
    expect(hatch).toMatch(/var\(--surface\)\s*60%/);
    expect(hatch).toMatch(/4\.5px/);
    expect(hatch).not.toMatch(/background-color|#[0-9a-f]{3,8}\b|rgb|oklch\(/i);
  });

  it('stays under forced colours: CanvasText stripes over Canvas, outside every layer', () => {
    const blocks = [...css.matchAll(/@media\s*\(forced-colors:\s*active\)\s*\{/g)]
      .map((m) => body(m.index!))
      .filter((b) => !layers.some((l) => b.start > l.start && b.end < l.end));
    const forced = blocks.map((b) => rule(b.text)).find((r) => r !== null);
    expect(forced, 'no [data-estimate] rule in an unlayered forced-colours block').toBeDefined();
    expect(forced).toMatch(/forced-color-adjust\s*:\s*none/);
    expect(forced).toMatch(/repeating-linear-gradient\([^;]*CanvasText/);
    expect(forced).toMatch(/background-color\s*:\s*Canvas\s*[;}]?/);
  });
});
