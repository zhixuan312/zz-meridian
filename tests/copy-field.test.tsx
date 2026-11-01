import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyField } from '@/components/ui/copy-field';
import { SurfaceOverride } from '@/components/base/surface';
import { useLayoutEffect } from 'react';

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

describe('a copy the browser refuses', () => {
  const refuse = () => vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) } });
  const code = () => screen.getByRole('group', { name: 'API key' }).querySelector('code')!;
  it('says so, and selects the value for the person to copy themselves', async () => {
    refuse();
    render(<CopyField label="Request ID" value="req_123" />);
    press('Request ID');
    await waitFor(() => expect(screen.getByText(/^Not copied/)).toBeTruthy());
    await waitFor(() => expect(String(window.getSelection())).toBe('req_123'));
  });
  it('shows a masked secret before selecting it, so what is selected is the value', async () => {
    refuse();
    render(<CopyField secret label="API key" value="zzm_live_abcdef0123456789" />);
    press('API key');
    await waitFor(() => expect(String(window.getSelection())).toBe('zzm_live_abcdef0123456789'));
    expect(code().textContent).toBe('zzm_live_abcdef0123456789');
  });
  it('keeps a secret masked in an embed, and says where it can be copied', async () => {
    refuse();
    render(<SurfaceOverride surface={{ kind: 'embed' }}><CopyField secret label="API key" value="zzm_live_abcdef0123456789" /></SurfaceOverride>);
    press('API key');
    await waitFor(() => expect(screen.getByText(/^Not copied/)).toBeTruthy());
    expect(code().textContent).toBe('zzm_live_••••••••6789');
    expect(String(window.getSelection())).toBe('');
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

describe('feedback belongs to the current value and copy attempt', () => {
  const first = 'zzm_live_public_dummy_first_1234';
  const second = 'zzm_live_public_dummy_second_5678';
  const code = () => screen.getByRole('group', { name: 'API key' }).querySelector('code')!;
  const live = () => screen.getByRole('group', { name: 'API key' }).querySelector('[aria-live]')!;
  const pending = () => Promise.withResolvers<void>();

  it('replaces a recent success with the next refusal, including manual selection', async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('refused'));
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      render(<CopyField secret label="API key" value={first} />);
      await act(async () => { press('API key'); });
      act(() => vi.advanceTimersByTime(100));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copied' })); });
      expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
      expect(live().textContent).not.toBe('');
      expect(code().textContent).toBe(first);
      expect(String(window.getSelection())).toBe(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['copied', 'refused', 'revealed'] as const)('does not carry %s state into a replacement secret, even at its first commit', async (state) => {
    vi.stubGlobal('navigator', { clipboard: { writeText: state === 'refused' ? () => Promise.reject(new Error('refused')) : () => Promise.resolve() } });
    const commits: string[] = [];
    function Field({ value }: { value: string }) {
      useLayoutEffect(() => { commits.push(code().textContent!); }, [value]);
      return <CopyField secret label="API key" value={value} />;
    }
    const { rerender } = render(<Field value={first} />);
    if (state === 'revealed') fireEvent.click(screen.getByRole('button', { name: 'Reveal API key' }));
    else await act(async () => { press('API key'); });
    rerender(<Field value={second} />);
    expect(commits.at(-1)).not.toBe(second);
    expect(code().textContent).not.toBe(second);
    expect(code().title).not.toBe(second);
    expect(live().textContent).toBe('');
    expect(screen.getByRole('button', { name: 'Reveal API key' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
  });

  it.each(['resolve', 'reject'] as const)('ignores an old value write that later completes via %s', async (completion) => {
    const oldWrite = pending();
    const newWrite = pending();
    const writeText = vi.fn().mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { rerender } = render(<CopyField secret label="API key" value={first} />);
    press('API key');
    rerender(<CopyField secret label="API key" value={second} />);
    press('API key');
    expect(writeText.mock.calls.map(([value]) => value)).toEqual([first, second]);
    await act(async () => { oldWrite[completion](); });
    expect(live().textContent).toBe('');
    expect(code().textContent).not.toBe(second);
    expect(code().title).not.toBe(second);
    await act(async () => { newWrite.resolve(); });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it.each(['resolve', 'reject'] as const)('ignores an older attempt completing via %s after the latest attempt', async (completion) => {
    const older = pending();
    const latest = pending();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise) } });
    render(<CopyField secret label="API key" value={first} />);
    press('API key');
    press('API key');
    await act(async () => { latest[completion === 'resolve' ? 'reject' : 'resolve'](); });
    const latestAnnouncement = live().textContent;
    await act(async () => { older[completion](); });
    expect(live().textContent).toBe(latestAnnouncement);
    expect(Boolean(screen.queryByRole('button', { name: 'Copied' }))).toBe(completion === 'reject');
    expect(code().textContent === first).toBe(completion === 'resolve');
  });

  it('gives each successful attempt its own full confirmation interval', async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.resolve() } });
      render(<CopyField label="API key" value={first} />);
      await act(async () => { press('API key'); });
      act(() => vi.advanceTimersByTime(1000));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copied' })); });
      act(() => vi.advanceTimersByTime(700));
      expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
      act(() => vi.advanceTimersByTime(900));
      expect(screen.getByRole('button', { name: 'Copy API key' })).toBeTruthy();
      expect(live().textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('selects the value again when a subsequent manual-copy fallback is needed', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('refused')) } });
    render(<CopyField secret label="API key" value={first} />);
    await act(async () => { press('API key'); });
    window.getSelection()?.removeAllRanges();
    await act(async () => { press('API key'); });
    expect(String(window.getSelection())).toBe(first);
  });

  it('remasks when a public field becomes secret without changing its value', () => {
    const { rerender } = render(<CopyField label="API key" value={first} />);
    expect(code().textContent).toBe(first);
    rerender(<CopyField secret label="API key" value={first} />);
    expect(code().textContent).not.toBe(first);
    expect(code().title).not.toBe(first);
  });

  it('keeps an embed replacement masked and unselected after an old refusal', async () => {
    const oldWrite = pending();
    vi.stubGlobal('navigator', { clipboard: { writeText: () => oldWrite.promise } });
    const field = (value: string) => <SurfaceOverride surface={{ kind: 'embed' }}><CopyField secret label="API key" value={value} /></SurfaceOverride>;
    const { rerender } = render(field(first));
    press('API key');
    rerender(field(second));
    await act(async () => { oldWrite.reject(); });
    expect(code().textContent).not.toBe(second);
    expect(code().title).not.toBe(second);
    expect(String(window.getSelection())).not.toBe(second);
    expect(live().textContent).toBe('');
    expect(screen.queryByRole('button', { name: 'Reveal API key' })).toBeNull();
  });
});
