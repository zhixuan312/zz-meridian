import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormSection } from '@/components/patterns/form-section';

describe('a read-only form section', () => {
  it('disables what it holds when it is a <form>, and when it is only its layout', () => {
    for (const as of ['form', 'div'] as const) {
      const { unmount } = render(<FormSection as={as} title="Workspace" readOnly><input aria-label="Name" defaultValue="Acme" /></FormSection>);
      expect(screen.getByText(/Read-only/)).toBeTruthy();
      expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).matches(':disabled'), as).toBe(true);
      unmount();
    }
  });
});
