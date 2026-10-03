import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import { AskAbout } from '@/components/patterns/ask-about';
import { Proposal } from '@/components/patterns/proposal';
import { HostBridge } from '@/lib/host';

describe('agent affordances', () => {
  it('Ask renders nothing on the console, where no agent listens', () => {
    const { container } = render(<Tooltip.Provider><AskAbout question="Why did errors rise?" /></Tooltip.Provider>);
    expect(container.textContent).toBe('');
  });

  it('a Proposal changes nothing until a person approves, then applies once', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    render(<Proposal title="Raise Parallax AI's rate limit" reason="429s rose 14%." changes={[{ label: 'Limit', from: '1,000 rpm', to: '2,000 rpm' }]} onApprove={apply} />);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(screen.getByText('Applied')).toBeInTheDocument());
    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
  });

  it('a failed Proposal says nothing changed and offers to try again', async () => {
    render(<Proposal title="Raise the limit" reason="r" changes={[]} onApprove={() => Promise.reject(new Error('no'))} />);
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/nothing changed/i));
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('the host bridge', () => {
  it('initialises with the host, applies its context, and accepts messages only from the host', async () => {
    const sent: { method?: string }[] = [];
    const reply = (data: unknown, source: Window | null) => window.dispatchEvent(new MessageEvent('message', { data, source }));
    vi.spyOn(window, 'postMessage').mockImplementation((m: any) => {
      sent.push(m);
      if (m.method === 'ui/initialize') {
        // A stranger answers first with the wrong context; the bridge must ignore it.
        queueMicrotask(() => reply({ jsonrpc: '2.0', id: m.id, result: { hostContext: { theme: 'dark' } } }, null));
        queueMicrotask(() => reply({ jsonrpc: '2.0', id: m.id, result: { hostContext: { theme: 'light', displayMode: 'inline' } } }, window));
      }
    });
    const b = new HostBridge(window);
    const ctx = await b.initialize('ZZ Meridian', '1.0.0');
    expect(sent.map((m) => m.method)).toEqual(['ui/initialize', 'ui/notifications/initialized']);
    expect(ctx.theme).toBe('light');
    expect(ctx.displayMode).toBe('inline');
    vi.restoreAllMocks();
  });
});
