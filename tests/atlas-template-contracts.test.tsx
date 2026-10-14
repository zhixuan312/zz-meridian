import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The template's own code, watched: every render of it passes through these counts, whoever asked for it.
const seen = vi.hoisted(() => ({ records: 0, skeleton: 0 }));
vi.mock('@/components/templates/records', async (original) => {
  const actual = await original<typeof import('@/components/templates/records')>();
  return {
    ...actual,
    Records: (props: Parameters<typeof actual.Records>[0]) => { seen.records += 1; return actual.Records(props); },
    RecordsSkeleton: (props: Parameters<typeof actual.RecordsSkeleton>[0]) => { seen.skeleton += 1; return actual.RecordsSkeleton(props); },
  };
});

import RailPreview from '@/components/patterns/rail/preview';
import RecordsPreview from '@/components/templates/records/preview';

const TEMPLATES = path.resolve(import.meta.dirname, '../src/components/templates');
/** Every page template, by folder, with the preview the Atlas draws for it. A new template is added here. */
const PREVIEWS: Record<string, ComponentType> = { records: RecordsPreview };
const STATES = ['Normal', 'Loading', 'Empty', 'Filtered-empty', 'Error', 'Partial', 'Read-only'];

/** The `## States` table of a template's spec: each state with the one cell that says what became of it. */
function dispositions(name: string): Map<string, string> {
  const md = fs.readFileSync(path.join(TEMPLATES, name, 'README.md'), 'utf8');
  const section = (md.split(/^## States$/m)[1] ?? '').split(/^## /m)[0];
  const out = new Map<string, string>();
  for (const line of section.split('\n')) {
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length === 2 && STATES.includes(cells[0])) out.set(cells[0], cells[1]);
  }
  return out;
}
const draw = (Preview: ComponentType) => render(<Tooltip.Provider><Preview /></Tooltip.Provider>);
/** The specimen a preview labels `label`: its whole section. */
const specimen = (label: string) => screen.getAllByRole('heading', { level: 3 }).find((h) => h.textContent === label)?.closest('section') ?? null;

describe('a page template is finished: its spec and its preview say the same', () => {
  it('has a preview here for every template folder', () => {
    const folders = fs.readdirSync(TEMPLATES, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    expect(folders.sort()).toEqual(Object.keys(PREVIEWS).sort());
  });

  for (const [name, Preview] of Object.entries(PREVIEWS)) {
    it(`${name}: is beta, and every state is covered by a specimen the preview draws or is inapplicable with a reason`, () => {
      expect(fs.readFileSync(path.join(TEMPLATES, name, 'README.md'), 'utf8')).toMatch(/^Status: beta$/m);
      const rows = dispositions(name);
      const { container } = draw(Preview);
      const labels = [...container.querySelectorAll('h3, figcaption')].map((e) => e.textContent);
      for (const state of STATES) {
        const cell = rows.get(state) ?? '';
        expect(cell, state).toMatch(/^(Covered|Inapplicable): \S/);
        if (!cell.startsWith('Covered')) continue;
        const named = [...cell.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1]);
        expect(named.length, `${state} names its specimen`).toBeGreaterThan(0);
        for (const label of named) expect(labels, `${state}: "${label}"`).toContain(label);
      }
    });

    it(`${name}: the preview draws the template itself`, () => {
      const { container } = draw(Preview);
      expect(container.querySelectorAll(`[data-template="${name}"]`).length).toBeGreaterThan(0);
    });
  }
});

describe('the records template, state by state', () => {
  it('draws every arrangement with its own code, the loading one included', () => {
    seen.records = 0;
    seen.skeleton = 0;
    draw(RecordsPreview);
    const arranged = ['With a summary', 'Without a summary', 'Empty', 'Filtered-empty', 'Error', 'Partial', 'Read-only'];
    for (const label of arranged) expect(specimen(label)?.querySelector('[data-template="records"]') ?? null, label).not.toBeNull();
    expect(seen.records).toBeGreaterThanOrEqual(arranged.length);
    expect(seen.skeleton).toBeGreaterThan(0);
  });

  it('shows no table while loading, a failure with a way to retry, a missing figure as missing, and no way to create for a reader who may not', () => {
    draw(RecordsPreview);
    const loading = specimen('Loading');
    expect(loading).not.toBeNull();
    expect(loading!.querySelector('table')).toBeNull();
    expect(loading!.querySelectorAll('span[aria-hidden="true"]').length).toBeGreaterThan(0);

    const error = specimen('Error');
    expect(error).not.toBeNull();
    expect(error!.querySelector('[role="alert"]')).not.toBeNull();
    expect(within(error!).getByRole('button', { name: /retry/i })).toBeTruthy();

    const partial = specimen('Partial');
    expect(partial).not.toBeNull();
    expect(partial!.querySelector('[data-split="tiles"]')!.textContent).toContain('Unavailable');
    expect(partial!.querySelectorAll('tbody tr').length).toBeGreaterThan(0);

    const readOnly = specimen('Read-only');
    expect(readOnly).not.toBeNull();
    expect(readOnly!.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    expect(within(readOnly!).queryByRole('button', { name: /^(create|add|invite|new)\b/i })).toBeNull();
    // A read-only page says nothing about who could write: no sentence names a role beside what it may do.
    expect(readOnly!.querySelector('[data-template="records"]')?.textContent ?? '').not.toMatch(/\b(owners?|admins?|members?|viewers?)\b.*\bcan\b|\bonly an? \b|\bask an? \b/i);
  });
});

describe('the rail in the Atlas is the rail', () => {
  const open = async (trigger: HTMLElement) => { fireEvent.keyDown(trigger, { key: 'Enter' }); return screen.findByRole('menu'); };

  it('draws no menu of its own: nothing of the menu is on the page until a rail is opened', () => {
    draw(RailPreview);
    expect(screen.queryByText('Sign out')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows the account menu for one workspace and the switcher for several, and switching moves the check and the label', async () => {
    draw(RailPreview);
    expect(screen.getAllByRole('button', { name: /: account menu$/ }).length).toBeGreaterThan(0);
    const several = specimen('Several workspaces');
    expect(several).not.toBeNull();
    const trigger = () => within(several!).getAllByRole('button', { name: /: workspace menu$/ })[0];
    const menu = await open(trigger());
    expect(within(menu).getByText('Show')).toBeTruthy();
    const scopes = within(menu).getAllByRole('menuitemradio').filter((r) => r.closest('[role="group"]') === null);
    expect(scopes.length).toBeGreaterThan(1);
    expect(scopes.filter((s) => s.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    const other = scopes.find((s) => s.getAttribute('aria-checked') !== 'true')!;
    const label = other.textContent ?? '';
    expect(label).not.toBe('');
    fireEvent.click(other);
    expect(trigger().getAttribute('aria-label')).toContain(label);
    const again = await open(trigger());
    const checked = within(again).getAllByRole('menuitemradio').filter((r) => r.closest('[role="group"]') === null && r.getAttribute('aria-checked') === 'true');
    expect(checked.map((s) => s.textContent)).toEqual([label]);
  });

  it('offers the personas of View as from the real menu, with one who is out of reach', async () => {
    draw(RailPreview);
    const viewAs = specimen('View as');
    expect(viewAs).not.toBeNull();
    const menu = await open(within(viewAs!).getAllByRole('button', { name: /menu$/ })[0]);
    const personas = within(within(menu).getByRole('group', { name: 'View as' })).getAllByRole('menuitemradio');
    expect(personas.length).toBeGreaterThan(1);
    expect(personas.filter((p) => p.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(personas.some((p) => p.getAttribute('aria-disabled') === 'true' || p.hasAttribute('data-disabled'))).toBe(true);
  });
});
