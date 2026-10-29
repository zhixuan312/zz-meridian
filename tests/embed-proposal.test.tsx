import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import { SurfaceOverride } from '@/components/base/surface';
import { EmbedProposal } from '../app/embed/proposal/view';

/** The proposal embed, connected to a host whose apply tool answers `result`, and the card after Approve is pressed. */
async function approveWith(result: unknown) {
  const callTool = vi.fn(async () => result);
  const share = vi.fn();
  render(
    <Tooltip.Provider>
      <SurfaceOverride surface={{ kind: 'embed', mode: 'inline', connected: true, callTool, share }}>
        <EmbedProposal />
      </SurfaceOverride>
    </Tooltip.Provider>,
  );
  const card = screen.getByRole('article', { name: /Raise Northwind Labs' rate limit/ });
  await act(async () => { fireEvent.click(within(card).getByRole('button', { name: 'Approve' })); });
  return { card, callTool };
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

  test('a tool call that threw shows Not applied, never Applied', async () => {
    const { card } = await approveWith(Promise.reject(new Error('host gone')));
    expect(within(card).queryByText('Applied')).toBeNull();
    expect(within(card).getByText('Not applied')).toBeInTheDocument();
  });
});
