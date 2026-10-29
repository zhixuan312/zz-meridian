import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

describe('Input and Textarea', () => {
  it('stay invalid when a Field hands them aria-invalid undefined', () => {
    const field = { id: 'x', 'aria-invalid': undefined } as const;
    const { container } = render(<><Input {...field} invalid /><Textarea {...field} invalid /></>);
    for (const c of container.querySelectorAll('input, textarea')) expect(c.getAttribute('aria-invalid')).toBe('true');
  });
  it('draw a read-only field sunk, so it does not look editable', () => {
    const { container } = render(<><Input readOnly defaultValue="ws_live_31" /><Textarea readOnly defaultValue="note" /></>);
    for (const frame of container.children) expect((frame as HTMLElement).className).toMatch(/(^|\s)has-\[(input|textarea):read-only\]:bg-surface-sunk(\s|$)/);
  });
});
