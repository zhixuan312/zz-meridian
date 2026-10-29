import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from 'radix-ui';

vi.mock('next/navigation', () => ({ usePathname: () => '/members', useRouter: () => ({ refresh() {}, push() {}, replace() {} }) }));
import { AssistantPanel } from '@/components/patterns/assistant';

describe('the assistant, while an input method composes', () => {
  it('stays open on the Escape that cancels the composition, and closes on a plain one', () => {
    const onClose = vi.fn();
    render(<Tooltip.Provider><AssistantPanel inline messages={[]} onSend={() => {}} onClose={onClose} onDecide={() => {}} /></Tooltip.Provider>);
    const box = screen.getByRole('textbox');
    fireEvent.keyDown(box, { key: 'Escape', isComposing: true, keyCode: 229 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
