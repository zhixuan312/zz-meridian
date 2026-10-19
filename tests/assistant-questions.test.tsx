import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { Tooltip } from 'radix-ui';
import type { UIMessage } from 'ai';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AppShell, PageFrame } from '@/components/base/shell';
import { AssistantPanel } from '@/components/patterns/assistant';
import { useShareView } from '@/components/base/use-share-view';
import { contextText, type SharedContext } from '@/lib/shared-context';

vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });

const QUESTIONS = ['Why did requests change over the last 30 days?', 'Is anything on this page out of the ordinary?'];
const context: SharedContext = { view: 'home', title: 'Home', address: '/', scope: 'last 30 days', facts: [], insights: [], unknowns: [], questions: QUESTIONS };
const noop = () => {};
const panel = (props: Partial<Parameters<typeof AssistantPanel>[0]>) =>
  render(<Tooltip.Provider><AssistantPanel inline messages={[]} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} {...props} /></Tooltip.Provider>);

describe('the assistant panel\'s starter questions (#69)', () => {
  test('offers the page\'s questions while the thread is empty, and sends one as the person\'s own when pressed', () => {
    const onSend = vi.fn();
    panel({ questions: QUESTIONS, onSend });
    const list = screen.getByRole('list', { name: 'Questions to start with' });
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(QUESTIONS);
    fireEvent.click(within(list).getByRole('button', { name: QUESTIONS[1] }));
    expect(onSend).toHaveBeenCalledWith(QUESTIONS[1]);
  });

  test('keeps the plain empty state where the page offers none, and offers none once there is a thread', () => {
    const empty = panel({});
    expect(screen.getByText(/^Ask about this page: what a figure means, or why it moved\.$/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Questions to start with' })).toBeNull();
    empty.unmount();
    const said: UIMessage = { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] };
    panel({ questions: QUESTIONS, messages: [said] });
    expect(screen.queryByRole('list', { name: 'Questions to start with' })).toBeNull();
  });

  test('names Clear and Close on screen, in names that begin with the words shown', () => {
    panel({ messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }] });
    expect(screen.getByRole('button', { name: 'Clear conversation' })).toHaveTextContent(/^Clear$/);
    expect(screen.getByRole('button', { name: 'Close assistant' })).toHaveTextContent(/^Close$/);
  });

  test('never tells the model the questions', () => {
    expect(contextText(context)).not.toMatch(/out of the ordinary|Why did requests/);
  });

  test('in the shell, the panel offers the questions the view on screen shares', async () => {
    function View() {
      useShareView(context);
      return <p>Traffic, reliability and spend.</p>;
    }
    await act(async () => {
      render(
        <Tooltip.Provider>
          <AppShell rail={null} assistant={Promise.resolve(true)}>
            <PageFrame title="Home"><View /></PageFrame>
          </AppShell>
        </Tooltip.Provider>,
      );
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Assistant' }, { timeout: 10_000 }));
    const list = await screen.findByRole('list', { name: 'Questions to start with' }, { timeout: 10_000 });
    await waitFor(() => expect(within(list).getAllByRole('button')).toHaveLength(2));
  });
});
