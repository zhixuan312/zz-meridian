import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import type { UIMessage } from 'ai';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AssistantPanel } from '@/components/patterns/assistant';

const PREVIEW = { title: 'Change 2 members', tone: 'neutral', changes: [{ label: 'Alice Moreno', from: 'Active', to: 'Suspended' }, { label: 'Ravi Patel', from: 'Active', to: 'Suspended' }] };
const REMOVE = { title: 'Remove Alice Moreno', tone: 'critical', changes: [{ label: 'Alice Moreno', from: 'Members', to: 'Removed' }] };

/** One assistant turn proposing a change, with the tool part in the given state. */
const turn = (tool: Record<string, unknown>, preview = PREVIEW, name = 'update_members'): UIMessage[] => [
  { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Suspend them' }] },
  { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Here is the change.' }, { type: 'data-proposal', id: 'c1', data: preview }, { type: `tool-${name}`, toolCallId: 'c1', input: { ids: ['members_3', 'members_4'], set: { status: 'Suspended' } }, ...tool }] } as UIMessage,
];
const show = (messages: UIMessage[], onDecide = vi.fn()) => {
  render(<Tooltip.Provider><AssistantPanel inline messages={messages} onSend={() => {}} onClose={() => {}} onDecide={onDecide} /></Tooltip.Provider>);
  return onDecide;
};

describe('a proposed change in the panel', () => {
  test('waiting: the server preview as a Proposal; Approve and Dismiss answer the approval', () => {
    const decide = show(turn({ state: 'approval-requested', approval: { id: 'ap1' } }));
    const card = screen.getByRole('article', { name: /Change 2 members/ });
    expect(within(card).getByText('Alice Moreno')).toBeInTheDocument();
    expect(within(card).getAllByText('Suspended')).toHaveLength(2);
    fireEvent.click(within(card).getByRole('button', { name: 'Approve' }));
    expect(decide).toHaveBeenCalledWith('ap1', true);
    fireEvent.click(within(card).getByRole('button', { name: 'Dismiss' }));
    expect(decide).toHaveBeenCalledWith('ap1', false);
  });

  test('a removal asks for "Approve and remove"', () => {
    show(turn({ state: 'approval-requested', approval: { id: 'ap2' } }, REMOVE, 'remove_members'));
    expect(screen.getByRole('button', { name: 'Approve and remove' })).toBeInTheDocument();
  });

  test('approved and running, applied, failed and dismissed each show their state and no buttons', () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ state: 'approval-responded', approval: { id: 'a', approved: true } }, /Applying/],
      [{ state: 'output-available', output: [], approval: { id: 'a', approved: true } }, /Applied/],
      [{ state: 'output-error', errorText: 'boom', approval: { id: 'a', approved: true } }, /Not applied/],
      [{ state: 'output-denied', approval: { id: 'a', approved: false } }, /Dismissed/],
    ];
    for (const [tool, label] of cases) {
      const { unmount } = render(<Tooltip.Provider><AssistantPanel inline messages={turn(tool)} onSend={() => {}} onClose={() => {}} onDecide={() => {}} /></Tooltip.Provider>);
      const card = screen.getByRole('article', { name: /Change 2 members/ });
      expect(within(card).getByText(label)).toBeInTheDocument();
      expect(within(card).queryByRole('button', { name: 'Approve' })).toBeNull();
      unmount();
    }
  });

  test('closed without a decision: Expired, with its reason, and it can no longer be approved', () => {
    show(turn({ state: 'output-denied', approval: { id: 'a', approved: false, reason: 'The page was reloaded before anyone approved it.' } }));
    const card = screen.getByRole('article', { name: /Change 2 members/ });
    expect(within(card).getByText(/Expired/)).toBeInTheDocument();
    expect(within(card).getByText('The page was reloaded before anyone approved it.')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /Approve/ })).toBeNull();
  });

  test('a query shows no Proposal', () => {
    render(<Tooltip.Provider><AssistantPanel inline messages={[{ id: 'a1', role: 'assistant', parts: [{ type: 'tool-query_members', toolCallId: 'q', state: 'output-available', input: {}, output: { rows: [], total: 0 } }, { type: 'text', text: 'Nobody matches.' }] } as UIMessage]} onSend={() => {}} onClose={() => {}} onDecide={() => {}} /></Tooltip.Provider>);
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getByText('Nobody matches.')).toBeInTheDocument();
  });
});
