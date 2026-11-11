import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import { SurfaceOverride } from '@/components/base/surface';
import { EmbedProposal } from '../app/embed/proposal/view';

// Each case starts from a proposal nobody has answered: the outcome is kept for the session by design.
beforeEach(() => sessionStorage.clear());

/** The proposal embed, connected to a host whose apply tool answers `result`, and the card after Approve is pressed. */
async function approveWith(result: unknown) {
  const callTool = vi.fn(async () => result);
  const share = vi.fn();
  const view = render(
    <Tooltip.Provider>
      <SurfaceOverride surface={{ kind: 'embed', mode: 'inline', connected: true, callTool, share }}>
        <EmbedProposal />
      </SurfaceOverride>
    </Tooltip.Provider>,
  );
  const card = screen.getByRole('article', { name: /Raise Northwind Labs' rate limit/ });
  await act(async () => { fireEvent.click(within(card).getByRole('button', { name: 'Approve' })); });
  return { card, callTool, unmount: view.unmount };
}

describe('the proposal embed', () => {
  test('a tool that applied the change shows Applied, with no buttons', async () => {
    const { card, callTool } = await approveWith({ content: [] });
    expect(callTool).toHaveBeenCalledOnce();
    expect(within(card).getByText('Applied')).toBeInTheDocument();
    expect(within(card).queryByRole('button')).toBeNull();
  });

  test('a tool that refused shows Not applied and offers Try again, never Applied', async () => {
    const { card } = await approveWith({ isError: true, content: [{ type: 'text', text: 'Not allowed.' }] });
    expect(within(card).queryByText('Applied')).toBeNull();
    expect(within(card).getByText('Not applied')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  test('an applied outcome survives the host remounting the view, so Approve cannot run it twice', async () => {
    sessionStorage.clear();
    const { card, unmount } = await approveWith({ content: [] });
    expect(within(card).getByText('Applied')).toBeInTheDocument();
    unmount();
    // The host mounts the view again: it reads the outcome it kept, not a fresh "pending".
    render(
      <Tooltip.Provider>
        <SurfaceOverride surface={{ kind: 'embed', mode: 'inline', connected: true, callTool: vi.fn(), share: vi.fn() }}>
          <EmbedProposal />
        </SurfaceOverride>
      </Tooltip.Provider>,
    );
    const again = screen.getByRole('article', { name: /Raise Northwind Labs' rate limit/ });
    expect(within(again).getByText('Applied')).toBeInTheDocument();
    expect(within(again).queryByRole('button', { name: 'Approve' })).toBeNull();
    sessionStorage.clear();
  });

  test('a tool call that threw shows Not applied, never Applied', async () => {
    const { card } = await approveWith(Promise.reject(new Error('host gone')));
    expect(within(card).queryByText('Applied')).toBeNull();
    expect(within(card).getByText('Not applied')).toBeInTheDocument();
  });
});
