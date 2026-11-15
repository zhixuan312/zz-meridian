// After a save the bar folds away — `aria-hidden`, zero height, invisible — and the Save button that had the focus goes
// with it: a keyboard user's focus ring disappeared and focus sat inside a hidden region. The ring must go somewhere a
// person can see, which is the section's own first field.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FormSection } from '@/components/patterns/form-section';

/** A section whose dirty flag its own save clears, as the Settings view's does. */
function Section({ onSave }: { onSave: () => Promise<void> }) {
  const [dirty, setDirty] = useState(true);
  return (
    <FormSection title="Workspace" dirty={dirty} saving={false} onSave={async () => { await onSave(); setDirty(false); }}>
      <input aria-label="Name" defaultValue="Acme" />
    </FormSection>
  );
}

describe('a form section after its save', () => {
  it('moves focus from the folding save bar to its first field', async () => {
    render(<Section onSave={async () => {}} />);
    const save = screen.getByRole('button', { name: /save/i });
    save.focus();
    expect(document.activeElement).toBe(save);
    await act(async () => { fireEvent.click(save); });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Name' }));
  });
});
