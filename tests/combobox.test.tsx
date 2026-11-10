import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/components/ui/combobox';
import { Field } from '@/components/ui/field';

const PEOPLE = [
  { value: 'a', label: 'Amara Okafor', description: 'Support · Admin' },
  { value: 'p', label: 'Priya Nair', description: 'Engineering · Member' },
  { value: 's', label: 'Sofia Rossi', description: 'Design · Member' },
  { value: 'm', label: 'Marcus Reed', description: 'Engineering · suspended', disabled: true },
];

const open = () => {
  const input = screen.getByRole('combobox') as HTMLInputElement;
  fireEvent.click(input);
  return input;
};
const active = (input: HTMLElement) => input.getAttribute('aria-activedescendant');

describe('the combobox', () => {
  it('opens a listbox wired to the field, with the first row active', () => {
    render(<Combobox aria-label="Assignee" options={PEOPLE} />);
    const input = screen.getByRole('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-controls')).toBeNull();
    fireEvent.click(input);
    const list = screen.getByRole('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(active(input)).toBe(`${list.id}-0`);
    expect(screen.getAllByRole('option')).toHaveLength(PEOPLE.length);
    expect(screen.getAllByRole('option').every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('moves with the arrows, skips a disabled option, and Enter chooses', () => {
    const picked = vi.fn();
    render(<Combobox aria-label="Assignee" options={PEOPLE} onValueChange={picked} />);
    const input = open();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(active(input)).toMatch(/-1$/);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(active(input)).toMatch(/-2$/);
    // The fourth row is disabled: the highlight stays on the third rather than landing where it cannot be chosen.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(active(input)).toMatch(/-2$/);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(picked).toHaveBeenCalledWith('s');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('Sofia Rossi');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on the last row when Up is pressed on the closed field, as a Select does', () => {
    render(<Combobox aria-label="Assignee" options={PEOPLE.slice(0, 3)} />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const list = screen.getByRole('listbox');
    expect(active(input)).toBe(`${list.id}-2`);
  });

  it('narrows as the person types, and finds a match in a description or keywords', () => {
    render(<Combobox aria-label="Assignee" options={[...PEOPLE, { value: 'n', label: 'Nadia Karimi', description: 'Support · invited', keywords: 'nadia@zz.example' }]} />);
    const input = open();
    fireEvent.change(input, { target: { value: 'engineering' } });
    const labels = screen.getAllByRole('option').map((o) => o.textContent);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain('Priya Nair');
    expect(labels[1]).toContain('Marcus Reed');
    fireEvent.change(input, { target: { value: 'nadia@zz' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Nadia Karimi');
  });

  it('says nothing matches, with what was typed, instead of closing', () => {
    render(<Combobox aria-label="Assignee" options={PEOPLE} />);
    const input = open();
    fireEvent.change(input, { target: { value: 'zoe' } });
    expect(screen.getByText('No match for “zoe”')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('waits with its reason while the options load, and never says nothing matches', () => {
    render(<Combobox aria-label="Assignee" options={[]} loading />);
    const input = open();
    expect(screen.getByText('Loading options…')).toBeTruthy();
    expect(screen.queryByText(/No match/)).toBeNull();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('restores the chosen label on Escape, and shows a value that is not among the options', () => {
    render(<Combobox aria-label="Assignee" defaultValue="a" options={PEOPLE} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Amara Okafor');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'sof' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.value).toBe('Amara Okafor');
  });

  it('shows a custom value the list does not hold', () => {
    render(<Combobox aria-label="Reference" value="ABC-123" options={[]} />);
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('ABC-123');
  });

  it('offers typed text as a value only when the caller\'s pattern accepts it', () => {
    const picked = vi.fn();
    render(<Combobox aria-label="Reference" allowCustom customPattern={/^[A-Z]{3}-\d{3}$/} options={[]} onValueChange={picked} />);
    const input = open();
    fireEvent.change(input, { target: { value: '12' } });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText('No match for “12”')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'ABC-123' } });
    const row = screen.getByRole('option');
    expect(row).toHaveTextContent('Use “ABC-123”');
    fireEvent.click(row);
    expect(picked).toHaveBeenCalledWith('ABC-123');
    expect(input.value).toBe('ABC-123');
  });

  it('offers any typed text when no pattern is given, and does not duplicate an option that is that text', () => {
    const picked = vi.fn();
    render(<Combobox aria-label="Reference" allowCustom options={[{ value: 'ABC-123', label: 'ABC-123' }]} onValueChange={picked} />);
    const input = open();
    fireEvent.change(input, { target: { value: 'ZZ-9' } });
    expect(screen.getByRole('option')).toHaveTextContent('Use “ZZ-9”');
    fireEvent.change(input, { target: { value: 'ABC-123' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('ABC-123');
  });

  it('takes its name, description, invalid and required state from a Field', () => {
    render(
      <Field label="Assignee" required error="Choose a person">
        {(p) => <Combobox {...p} options={PEOPLE} />}
      </Field>,
    );
    const input = screen.getByRole('combobox');
    const label = document.querySelector('label')!;
    const error = screen.getByRole('alert');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('points a hint at the field, the same way, when there is no error', () => {
    render(
      <Field label="Assignee" hint="Everyone in the workspace">
        {(p) => <Combobox {...p} options={PEOPLE} />}
      </Field>,
    );
    const input = screen.getByRole('combobox');
    const hint = screen.getByText('Everyone in the workspace');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });
});
