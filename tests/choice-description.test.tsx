import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

/** The name a screen reader reads, and the description it reads after it. */
const said = (el: HTMLElement) => ({
  name: (el.getAttribute('aria-labelledby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' ').trim() || null,
  description: (el.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent).join(' ').trim() || null,
});

describe('a choice with a description', () => {
  it('is named by its label alone and described by the line under it: a checkbox', () => {
    render(<Checkbox label="Email me" description="At most once a day." aria-describedby="hint" />);
    render(<p id="hint">Saved with the form.</p>);
    const box = screen.getByRole('checkbox', { name: 'Email me' });
    expect(said(box)).toEqual({ name: 'Email me', description: 'Saved with the form. At most once a day.' });
  });

  it('a switch', () => {
    render(<Switch label="Live data" description="Refreshes every minute." />);
    expect(said(screen.getByRole('switch', { name: 'Live data' }))).toEqual({ name: 'Live data', description: 'Refreshes every minute.' });
  });

  it('a radio, as a row and as a card', () => {
    const options = [{ value: 'a', label: 'Monthly', description: 'Billed on the 1st.' }];
    render(<RadioGroup aria-label="Billing" options={options} />);
    render(<RadioGroup aria-label="Billing cards" variant="cards" options={[{ value: 'b', label: 'Yearly', description: 'Two months free.' }]} />);
    expect(said(screen.getByRole('radio', { name: 'Monthly' }))).toEqual({ name: 'Monthly', description: 'Billed on the 1st.' });
    expect(said(screen.getByRole('radio', { name: 'Yearly' }))).toEqual({ name: 'Yearly', description: 'Two months free.' });
  });
});
