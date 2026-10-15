import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyField } from '@/components/ui/copy-field';

/**
 * The Copy button says "Copied" only when the copy happened. It used to say so either way, on the one value the product
 * says it shows once — an API key's secret.
 */
const press = (label: string) => fireEvent.click(screen.getByRole('button', { name: `Copy ${label}` }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CopyField', () => {
  it('says Copied once the clipboard write resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<CopyField label="API key" value="zzm_live_abc123" />);
    press('API key');
    expect(writeText).toHaveBeenCalledWith('zzm_live_abc123');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy());
  });

  it('says nothing was copied when the write is refused', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<CopyField label="API key" value="zzm_live_abc123" />);
    press('API key');
    // The write was attempted and rejected; the button must not claim a copy, and nothing may announce one.
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
  });

  it('says nothing was copied where there is no clipboard at all', async () => {
    // `navigator.clipboard` is absent outside a secure context; the old code's `?.` made that a silent no-op that still
    // reported success.
    vi.stubGlobal('navigator', {});
    render(<CopyField label="API key" value="zzm_live_abc123" />);
    press('API key');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
  });
});
