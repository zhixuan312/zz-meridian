import { fireEvent, render, screen, within } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { describe, expect, it } from 'vitest';

import RailPreview from '@/components/patterns/rail/preview';
import RecordsPreview from '@/components/templates/records/preview';

const draw = (Preview: typeof RecordsPreview) => render(<Tooltip.Provider><Preview /></Tooltip.Provider>);
/** The specimen a preview labels `label`: its whole section. */
const specimen = (label: string) => screen.getAllByRole('heading', { level: 3 }).find((h) => h.textContent === label)?.closest('section') ?? null;


describe('the records template, state by state', () => {

  it('shows no table while loading, a failure with a way to retry, a missing figure as missing, and no way to create for a reader who may not', () => {
    draw(RecordsPreview);
    const loading = specimen('Loading');
    expect(loading).not.toBeNull();
    expect(loading!.querySelector('table')).toBeNull();
    expect(loading!.querySelectorAll('span[aria-hidden="true"]').length).toBeGreaterThan(0);

    const error = specimen('Error');
    expect(error).not.toBeNull();
    expect(error!.querySelector('[role="alert"]')).not.toBeNull();
    within(error!).getByRole('button', { name: /retry/i });

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
    within(menu).getByText('Show');
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
