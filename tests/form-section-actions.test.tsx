import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormSection } from '@/components/patterns/form-section';

describe('a form section\'s actions', () => {
  it('draws its actions beside its title, in the title column, on the title\'s row', () => {
    render(
      <FormSection title="Workspace" description="What this workspace is called." actions={<button type="button">Ask</button>}>
        <input aria-label="Name" />
      </FormSection>,
    );
    const title = screen.getByRole('heading', { level: 2, name: 'Workspace' });
    const action = screen.getByRole('button', { name: 'Ask' });
    // The title and the actions share a row that never wraps, so a phone keeps the actions beside the title.
    const row = title.parentElement!;
    expect(row).toContainElement(action);
    expect(row).toHaveClass('flex');
    expect(row).not.toHaveClass('flex-wrap');
    expect(row.closest('header')).not.toBeNull();
    // The description stays under the row, and the fields' card is not where the actions are.
    expect(row.nextElementSibling).toHaveTextContent('What this workspace is called.');
    expect(screen.getByRole('textbox', { name: 'Name' }).closest('header')).toBeNull();
  });

  it('draws the title alone when it has no actions', () => {
    render(<FormSection title="Workspace"><input aria-label="Name" /></FormSection>);
    const header = screen.getByRole('heading', { level: 2, name: 'Workspace' }).closest('header')!;
    expect(header.querySelectorAll('button')).toHaveLength(0);
  });
});
