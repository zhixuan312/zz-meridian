/**
 * The card contract: one suite for every card, driven by the registry.
 *
 * A card is a folder a reader can open: a module that exports the component, a preview that draws every state at once,
 * and a README. This file holds the three promises every card makes, so a card that breaks one is reported by one test
 * naming the card, instead of by a file of its own that a new card forgets to bring:
 *
 * - its module's export names are not empty;
 * - every state its preview draws renders, with no console error;
 * - axe finds no violation in what it drew.
 *
 * The cards come from `CARDS` (`src/system/registry.ts`, generated from the folders). The modules and previews come
 * from an eager glob: the registry holds `next/dynamic` wrappers, whose code arrives through a Suspense boundary, and
 * a test wants the module itself.
 *
 * `tests/setup.ts` supplies the browser the previews expect under jsdom — `ResizeObserver`, `IntersectionObserver`,
 * pointer capture and `scrollIntoView`. A preview that still needs something jsdom has no answer for fails here with
 * the card's name and the API it asked for, and is never skipped.
 */
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { Tooltip } from 'radix-ui';
import type { ComponentType } from 'react';
import { afterAll, describe, expect, it } from 'vitest';
import { CARDS } from '@/system/registry';

const MODULES = import.meta.glob('../src/components/*/*/index.tsx', { eager: true }) as Record<string, Record<string, unknown>>;
const PREVIEWS = import.meta.glob('../src/components/*/*/preview.tsx', { eager: true }) as Record<string, { default?: ComponentType }>;

/** `../src/components/ui/button/preview.tsx` is the card `ui/button`. */
const cardOf = (path: string) => path.replace('../src/components/', '').split('/').slice(0, 2).join('/');
const byCard = <T,>(found: Record<string, T>) => new Map(Object.entries(found).map(([p, m]) => [cardOf(p), m] as const));
const MODULE_OF = byCard(MODULES);
const PREVIEW_OF = byCard(PREVIEWS);

/**
 * Three cards document a layer rather than a component: `icons`, `motion` and `planes` are what the other cards are
 * built from, and hold a preview and a README with nothing to import. Every other card folder exports a module, so a
 * card that loses its own is named here instead of passing as a layer page.
 */
const NO_MODULE = ['base/icons', 'base/motion', 'base/planes'];

/**
 * What axe is asked, and what it is not.
 *
 * `color-contrast` needs a layout engine and a canvas to compare two colours. jsdom has neither, and contrast is
 * measured where it can be: `node scripts/contrast.ts` over the token pairs, and the browser audit over every page.
 *
 * `heading-order` and `landmark-unique` judge a document, and a preview is not one. The card contract has a preview
 * draw every state at once, so a card that carries a landmark draws it once per state by design; and the page's
 * headings belong to the Atlas that frames the preview, which draws none of its own. A card owns neither.
 */
const AXE: axe.RunOptions = {
  // Only the violations are asked for: axe computes its pass and incomplete data too unless told otherwise, and that
  // triples the cost of every analysis for output nothing here reads.
  resultTypes: ['violations'],
  rules: {
    // A card is measured on its own, not as a page.
    'color-contrast': { enabled: false },
    'heading-order': { enabled: false },
    'landmark-unique': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'landmark-one-main': { enabled: false },
    region: { enabled: false },
    'bypass': { enabled: false },
    'html-has-lang': { enabled: false },
    'document-title': { enabled: false },
    'skip-link': { enabled: false },
  },
};

/** The providers the card tests render a preview in: Radix's tooltip reads its delay and its portal from one. */
const draw = (Preview: ComponentType) => render(<Tooltip.Provider><Preview /></Tooltip.Provider>);

/** The card's name and the API jsdom could not answer, never a bare stack: a preview fails here naming what it needs. */
function renderCard(card: string, preview: ComponentType | undefined) {
  if (!preview) throw new Error(`${card}: no preview.tsx, so no state can render`);
  try {
    return draw(preview);
  } catch (error) {
    const said = (error as Error).message;
    const api = /\b([A-Za-z]+) is not (?:a function|defined|implemented)\b/.exec(said)?.[1];
    if (!api) throw new Error(`${card}: its preview threw: ${said}`);
    throw new Error(`${card}: its preview needs ${api}, which jsdom does not provide: ${said}`);
  }
}

const checked: string[] = [];

// The registry is generated from the card folders, so the two name the same cards: a folder the registry does not know is
// a card this suite would never open, and a registry entry without a preview is a card the Atlas cannot draw.
it('every card folder holds a preview, and the registry names them all', () => {
  const folders = [...PREVIEW_OF.keys()].sort();
  expect(folders, 'a card folder the registry does not name').toEqual(CARDS.map((c) => c.dir.replace('src/components/', '')).sort());
});

for (const card of CARDS) {
  const name = card.dir.replace('src/components/', '');
  describe(name, () => {
    it('its module exports a name', () => {
      const found = MODULE_OF.get(name);
      if (!found) {
        expect(NO_MODULE, `${name} holds no index.tsx`).toContain(name);
        return;
      }
      expect(Object.keys(found), `${name} exports nothing`).not.toEqual([]);
    });

    it('every state its preview draws renders, with no console error', () => {
      const said: unknown[][] = [];
      const report = console.error;
      console.error = (...args: unknown[]) => { said.push(args); };
      try {
        const { container } = renderCard(name, PREVIEW_OF.get(name)?.default);
        expect(container.childElementCount, `${name} drew nothing`).toBeGreaterThan(0);
      } finally {
        console.error = report;
      }
      expect(said.map((args) => String(args[0])), name).toEqual([]);
    });

    it('axe finds no violation', async () => {
      const { container } = renderCard(name, PREVIEW_OF.get(name)?.default);
      const { violations } = await axe.run(container, AXE);
      // A failure names the rule and the element, so the fix does not start by finding them.
      expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), name).toEqual([]);
      checked.push(name);
      // The command's output is the report, so every card it checked is named there and the closing line carries the
      // count. It goes to stdout directly: this repository's runner does not print a test's `console.log`.
      process.stdout.write(`cards-contract: ${name} ok\n`);
    }, 300_000);
  });
}

afterAll(() => {
  process.stdout.write(`cards-contract: ${checked.length} cards checked, every one named above\n`);
});
