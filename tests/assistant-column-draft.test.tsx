import { act, fireEvent, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
const stop = vi.fn();
const setMessages = vi.fn();
const clearError = vi.fn();
const chat = { messages: [] as unknown[], setMessages, sendMessage: vi.fn(), regenerate: vi.fn(), addToolApprovalResponse: vi.fn(), stop, clearError, status: 'ready', error: undefined as Error | undefined };
vi.mock('@ai-sdk/react', () => ({ useChat: () => chat }));
import { AssistantColumn } from '@/components/patterns/assistant';

const column = (open: boolean) => <Tooltip.Provider><Suspense fallback={null}><AssistantColumn open={open} onClose={() => {}} /></Suspense></Tooltip.Provider>;
/** Drawn inside an awaited act: the column suspends until the thread's scope resolves, and resumes when it settles. */
async function draw(open: boolean, rerender?: (ui: React.ReactElement) => void) {
  let out!: ReturnType<typeof render>;
  await act(async () => { if (rerender) rerender(column(open)); else out = render(column(open)); });
  return out;
}

describe('the assistant column', () => {
  it('keeps a message typed and not sent while the panel is closed', async () => {
    const { rerender } = await draw(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Who joined this week' } });
    await draw(false, rerender);
    expect(screen.queryByRole('textbox')).toBeNull();
    await draw(true, rerender);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Who joined this week');
  });

  it('stops a reply that is still arriving when the conversation is cleared', async () => {
    chat.messages = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }];
    chat.status = 'streaming';
    await draw(true);
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(stop).toHaveBeenCalledOnce();
    expect(setMessages).toHaveBeenLastCalledWith([]);
  });

  it('takes the last error and its Retry away with the conversation it was about', async () => {
    chat.messages = [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }];
    chat.status = 'error';
    chat.error = new Error('The assistant could not be reached.');
    await draw(true);
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(clearError).toHaveBeenCalledOnce();
    expect(setMessages).toHaveBeenLastCalledWith([]);
  });
});
