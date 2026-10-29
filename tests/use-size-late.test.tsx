import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSize } from '@/components/charts/use-size';

// useSize attached its observer once, at mount, so an element that first rendered later (a Trend
// chart's widening line once live data crossed its domain) was never measured. Each observer here records what it watches
// and can be fired with a size.

type Watch = { el: Element; fire: (width: number, height: number) => void; live: boolean };
let watched: Watch[] = [];
vi.stubGlobal(
  'ResizeObserver',
  class {
    private seen: Watch[] = [];
    constructor(private callback: ResizeObserverCallback) {}
    observe(el: Element) {
      const w: Watch = { el, live: true, fire: (width, height) => this.callback([{ target: el, contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver) };
      this.seen.push(w);
      watched.push(w);
    }
    unobserve(el: Element) {
      for (const w of this.seen) if (w.el === el) w.live = false;
    }
    disconnect() {
      for (const w of this.seen) w.live = false;
    }
  },
);

function Late() {
  const [shown, setShown] = useState(false);
  const [ref, size] = useSize<HTMLParagraphElement>();
  return (
    <div>
      <button onClick={() => setShown((s) => !s)}>toggle</button>
      {shown ? <p ref={ref}>Scale widened</p> : null}
      <output>{size.height}</output>
    </div>
  );
}

const live = () => watched.filter((w) => w.live).map((w) => w.el);

describe('useSize', () => {
  it('measures an element that first renders after mount', () => {
    watched = [];
    const { container, getByText } = render(<Late />);
    expect(live()).toEqual([]);
    act(() => getByText('toggle').click());
    const p = container.querySelector('p');
    expect(live()).toEqual([p]);
    act(() => watched.find((w) => w.el === p)!.fire(240, 34));
    expect(container.querySelector('output')?.textContent).toBe('34');
  });

  it('stops watching an element that leaves', () => {
    watched = [];
    const { getByText } = render(<Late />);
    act(() => getByText('toggle').click());
    act(() => getByText('toggle').click());
    expect(live()).toEqual([]);
  });
});
