// Below 1024px the assistant covers the page behind a scrim, so it has to behave like a dialog there: it is named, it is
// modal, the page behind it is hidden from assistive technology, Tab stays inside it, and Escape closes it. From 1024px it
// is the shell's third column and the page beside it must stay usable, so none of that may apply. Measured on the
// 0.39.8 build at 390px: the sheet was an `<aside>` with a scrim, Tab tabbed out into the dimmed page, and Escape then
// no longer closed it because the key was handled on the panel that no longer had focus.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssistantPanel } from '@/components/patterns/assistant';

/** Answer every media query the same way: `true` is a phone (the sheet), `false` a wide screen (the column). */
function screenThatMatches(matches: boolean) {
  globalThis.matchMedia = ((query: string) => ({ matches, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof globalThis.matchMedia;
}

function panel(onClose: () => void = () => {}) {
  return render(<AssistantPanel messages={[]} onSend={() => {}} onClose={onClose} onDecide={() => {}} />);
}

const WIDE = globalThis.matchMedia;
afterEach(() => {
  globalThis.matchMedia = WIDE;
});

describe('the assistant on a phone', () => {
  it('is a dialog named Assistant, and says it is modal', () => {
    screenThatMatches(true);
    panel();
    const dialog = screen.getByRole('dialog', { name: 'Assistant' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('data-assistant')).toBe(true);
  });

  it('hides the page behind it from assistive technology', () => {
    screenThatMatches(true);
    const page = document.createElement('div');
    page.textContent = 'the page';
    document.body.appendChild(page);
    panel();
    expect(page.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps focus inside itself, starting in the panel', () => {
    screenThatMatches(true);
    panel();
    const dialog = screen.getByRole('dialog', { name: 'Assistant' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    // Tab from the last control in the panel wraps back into it rather than reaching the page.
    const last = screen.getByRole('button', { name: 'Send' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape', () => {
    screenThatMatches(true);
    const onClose = vi.fn();
    panel(onClose);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Assistant' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('the assistant on a wide screen', () => {
  it('is a plain landmark, not a dialog, so the page beside it stays usable', () => {
    screenThatMatches(false);
    panel();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Assistant' })).toBeTruthy();
    // Nothing may be hidden from assistive technology: the column is beside the page, not over it.
    expect(document.body.getAttribute('aria-hidden')).toBeNull();
  });

  it('closes on Escape from inside the column', () => {
    screenThatMatches(false);
    const onClose = vi.fn();
    panel(onClose);
    fireEvent.keyDown(screen.getByRole('complementary', { name: 'Assistant' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
