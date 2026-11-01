import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from '@/components/ui/search-input';

function Search({ dismissOnEscape = false }: { dismissOnEscape?: boolean }) {
  const [value, setValue] = useState('ready');
  const [submitted, setSubmitted] = useState('');
  const [dismissed, setDismissed] = useState(false);
  return <>
    <SearchInput aria-label="Search records" value={value} onValueChange={setValue} onKeyDown={(event) => {
      if (event.key === 'Enter') setSubmitted(value);
      if (dismissOnEscape && event.key === 'Escape') { event.preventDefault(); setDismissed(true); }
    }} />
    <output aria-label="Submitted query">{submitted}</output>
    {dismissed ? <p>Parent dismissed</p> : null}
  </>;
}

describe('search keyboard composition', () => {
  it.each([{ disabled: true }, { readOnly: true }])('keeps the query unchanged when unavailable: %j', (state) => {
    const change = vi.fn();
    render(<SearchInput aria-label="Locked query" value="keep me" onValueChange={change} {...state} />);
    const clear = screen.getByRole('button', { name: 'Clear search' });
    expect(clear).toBeDisabled();
    fireEvent.click(clear);
    expect(change).not.toHaveBeenCalled();
  });

  it('does not clear a read-only query on Escape', () => {
    const change = vi.fn();
    render(<SearchInput aria-label="Read-only query" value="keep me" onValueChange={change} readOnly />);
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
    expect(change).not.toHaveBeenCalled();
  });

  it('does not consume a global shortcut for a disabled search', () => {
    render(<SearchInput aria-label="Disabled query" value="" onValueChange={() => {}} disabled shortcut="/" />);
    expect(fireEvent.keyDown(document.body, { key: '/' })).toBe(true);
  });

  it('keeps the caller’s Enter action without losing Escape clear and second-Escape blur', () => {
    render(<Search />);
    const input = screen.getByRole('searchbox', { name: 'Search records' }) as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByLabelText('Submitted query').textContent).toBe('ready');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.activeElement).not.toBe(input);
  });

  it('lets the caller consume Escape without clearing or blurring the search', () => {
    render(<Search dismissOnEscape />);
    const input = screen.getByRole('searchbox', { name: 'Search records' }) as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('Parent dismissed')).toBeTruthy();
    expect(input.value).toBe('ready');
    expect(document.activeElement).toBe(input);
  });

  it('leaves Escape to an in-progress IME composition instead of erasing the query', () => {
    render(<Search />);
    const input = screen.getByRole('searchbox', { name: 'Search records' }) as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    expect(input.value).toBe('ready');
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
  });
});
