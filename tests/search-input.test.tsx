import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
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
