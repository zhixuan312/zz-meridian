import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyField } from '@/components/ui/copy-field';
import { SurfaceOverride } from '@/components/base/surface';

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
    // Past a turn of the event loop, not on the first tick: a "Copied" set after a promise or a timer is the regression
    // this guards, and a `waitFor` around a predicate that already holds returns without waiting for one.
    await new Promise((r) => setTimeout(r, 25));
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
  });
});

describe('a masked secret', () => {
  const shown = () => screen.getByRole('group', { name: 'API key' }).querySelector('code')!.textContent;
  it('keeps only a word prefix such as zzm_live_, never a part of the random value after an underscore in it', () => {
    render(<CopyField secret label="API key" value="zzm_live_7Hq2v9_Xk3pLm0aQ4rT" />);
    expect(shown()).toBe('zzm_live_••••••••Q4rT');
  });
  it('shows nothing of a short secret but the dots', () => {
    render(<CopyField secret label="API key" value="ab12" />);
    expect(shown()).toBe('••••••••');
  });
  it('is never offered for Reveal in an embed', () => {
    render(<SurfaceOverride surface={{ kind: 'embed' }}><CopyField secret label="API key" value="zzm_live_abcdef0123456789" /></SurfaceOverride>);
    expect(screen.queryByRole('button', { name: 'Reveal API key' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
  });
});

describe('a state drawn still in the Atlas', () => {
  const shown = () => screen.getByRole('group', { name: 'API key' }).querySelector('code')!.textContent;
  it('holds Copied past the 1.6s a real copy shows it for', () => {
    vi.useFakeTimers();
    try {
      render(<CopyField secret label="API key" value="zzm_live_abcdef0123456789" data-preview-state="copied" />);
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
  it('shows a revealed secret whole, and still masks it in an embed', () => {
    const { unmount } = render(<CopyField secret label="API key" value="zzm_live_abcdef0123456789" data-preview-state="revealed" />);
    expect(shown()).toBe('zzm_live_abcdef0123456789');
    unmount();
    render(<SurfaceOverride surface={{ kind: 'embed' }}><CopyField secret label="API key" value="zzm_live_abcdef0123456789" data-preview-state="revealed" /></SurfaceOverride>);
    expect(shown()).toBe('zzm_live_••••••••6789');
  });
});
