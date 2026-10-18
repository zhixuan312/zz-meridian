// A period tap re-rendered the page and the segmented control then read its option's offsetLeft inside the same commit,
// forcing a whole-page layout that dropped a frame on the runner's phone (run 39132502117). A read in the next frame's
// callback forces it too, since that callback runs before the frame's layout; a ResizeObserver's callback runs after
// layout, so the control measures there, observing the newly selected option afresh on a change.
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Segmented } from '@/components/ui/segmented';

const options = [{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }];
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** A ResizeObserver as a browser delivers it: a first observation of each observed element, after the next layout. */
let inObserver = false;
class AfterLayout {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    requestAnimationFrame(() => {
      inObserver = true;
      try { this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver); } finally { inObserver = false; }
    });
  }
  unobserve() {}
  disconnect() {}
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('reads layout only in a ResizeObserver callback, and draws the thumb on the selection a frame after a change', async () => {
  vi.stubGlobal('ResizeObserver', AfterLayout);
  const outside: string[] = [];
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(() => { if (!inObserver) outside.push('offsetLeft'); return 40; });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => { if (!inObserver) outside.push('offsetWidth'); return 60; });
  const view = render(<Segmented label="Reporting period" options={options} value="7d" onChange={() => {}} />);
  await act(async () => { await frame(); await frame(); });
  act(() => { view.rerender(<Segmented label="Reporting period" options={options} value="30d" onChange={() => {}} />); });
  await act(async () => { await frame(); await frame(); });
  expect(outside).toEqual([]);
  const thumb = view.container.querySelector<HTMLElement>('[role="radiogroup"] > span[aria-hidden]');
  expect(thumb?.style.width).toBe('60px');
  expect(thumb?.style.transform).toBe('translateX(38px)');
});
