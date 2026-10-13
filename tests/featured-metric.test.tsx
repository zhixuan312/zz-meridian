import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meridian } from '@/components/charts/meridian';
import { FeaturedMetric, type FeaturedFigure } from '@/components/patterns/featured-metric';

const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
const plain = (n: number) => String(n);
const figures = (c: HTMLElement) => [...c.querySelectorAll('[data-figure]')];
const value = (e: Element) => e.querySelector('[data-value]');

describe('the featured metric: one figure', () => {
  it('says what its change is against, in the caller\'s words or its own', () => {
    const a = render(<FeaturedMetric kicker="Requests · last 30 days" value={1280} format={plain} delta={0.062} />);
    expect(a.container.querySelector('[data-change]')).toHaveTextContent('vs previous period');
    a.unmount();
    const b = render(<FeaturedMetric kicker="Decided · this week" value={41} format={plain} delta={0.062} compare="vs the week before" />);
    expect(b.container.querySelector('[data-change]')).toHaveTextContent('vs the week before');
    expect(b.container.querySelector('[data-change]')).not.toHaveTextContent('vs previous period');
    b.unmount();
    const c = render(<FeaturedMetric kicker="Requests · last 30 days" value={1280} format={plain} />);
    expect(c.container.querySelector('[data-change]')).toBeNull();
  });

  it('draws one finding under the change, beside a neutral dot, and none when given none', () => {
    const a = render(<FeaturedMetric kicker="Revenue · last 30 days" value={1280} format={plain} delta={0.062} finding={{ text: 'The highest 30 days yet' }} />);
    const finding = a.container.querySelector('[data-finding]')!;
    expect(finding).toHaveTextContent('The highest 30 days yet');
    expect(finding.querySelector('[aria-hidden]')!.className).toContain('bg-ink-3');
    expect(a.container.querySelector('[data-change]')!.compareDocumentPosition(finding) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    a.unmount();
    const b = render(<FeaturedMetric kicker="Revenue · last 30 days" value={1280} format={plain} delta={0.062} />);
    expect(b.container.querySelector('[data-finding]')).toBeNull();
  });

  it('keeps its foot inside the lit surface, after the chart', () => {
    const { container } = render(
      <FeaturedMetric kicker="Revenue · last 30 days" value={1280} format={plain} foot={<a href="/business">How revenue is counted</a>}>
        <span data-chart="revenue" />
      </FeaturedMetric>,
    );
    const foot = container.querySelector('[data-foot]')!;
    expect(foot).toContainElement(screen.getByRole('link', { name: 'How revenue is counted' }));
    expect(container.querySelector('section')).toContainElement(foot as HTMLElement);
    expect(container.querySelector('[data-chart="revenue"]')!.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has no foot when given none', () => {
    const { container } = render(<FeaturedMetric kicker="Revenue · last 30 days" value={1280} format={plain} />);
    expect(container.querySelector('[data-foot]')).toBeNull();
  });
});

describe('the featured metric: reading a point of the page\'s Meridian', () => {
  it('reads the period when nothing is pointed at', () => {
    const { container } = render(
      <Meridian dates={weeks}>
        <FeaturedMetric kicker="Produced · this week" value={100} points={[10, 20, 30, 40]} format={plain} delta={0.1} />
      </Meridian>,
    );
    expect(value(container)).toHaveTextContent('100');
    expect(container.querySelector('[data-change]')).not.toBeNull();
    expect(container.querySelector('[data-point]')).toBeNull();
  });

  it('reads the pointed point and names it as the caller names points', () => {
    const { container } = render(
      <Meridian dates={weeks} day={weeks[1]}>
        <FeaturedMetric kicker="Produced · this week" value={100} points={[10, 20, 30, 40]} format={plain} delta={0.1} pointLabel={(date: string) => `Week ${date.slice(8)}.${date.slice(5, 7)}`} />
      </Meridian>,
    );
    expect(value(container)).toHaveTextContent('20');
    expect(container.querySelector('[data-point]')).toHaveTextContent('Week 14.09');
    expect(container.querySelector('[data-change]')).toBeNull();
  });

  it('names a point by its date when the caller names nothing', () => {
    const { container } = render(
      <Meridian dates={weeks} day={weeks[1]}>
        <FeaturedMetric kicker="Requests · last 30 days" value={100} points={[10, 20, 30, 40]} format={plain} delta={0.1} />
      </Meridian>,
    );
    expect(container.querySelector('[data-point]')).toHaveTextContent(/14 Sep\w* 2026/);
  });

  it('keeps the period\'s figure when its points are not one for each of the page\'s dates', () => {
    const { container } = render(
      <Meridian dates={weeks} day={weeks[1]}>
        <FeaturedMetric kicker="Requests · last 30 days" value={100} points={[10, 20]} format={plain} delta={0.1} />
      </Meridian>,
    );
    expect(value(container)).toHaveTextContent('100');
    expect(container.querySelector('[data-point]')).toBeNull();
    expect(container.querySelector('[data-change]')).not.toBeNull();
  });
});

describe('the featured metric: two figures of equal standing', () => {
  const decided: FeaturedFigure = {
    kicker: 'You decided · this week',
    value: 41,
    points: [30, 35, 38, 41],
    format: plain,
    delta: -0.05,
    intent: 'neutral',
    compare: 'vs the week before',
    caption: 'Nine a working day.',
    finding: { text: 'All 41 inside a day' },
    children: <span data-chart="decided" />,
  };
  const two = (
    <FeaturedMetric
      kicker="Agents produced · this week"
      value={1280}
      points={[900, 1000, 1100, 1280]}
      format={plain}
      delta={0.16}
      compare="vs the week before"
      caption="Two hundred and fifty a working day."
      peer={decided}
      foot={<a href="/business">How work is counted</a>}
      actions={<button type="button">Export</button>}
    >
      <span data-chart="produced" />
    </FeaturedMetric>
  );

  it('draws two halves of one lit surface, each with its own kicker, figure, change, caption, finding and chart', () => {
    const { container } = render(two);
    expect(container.querySelectorAll('section')).toHaveLength(1);
    expect(figures(container)).toHaveLength(2);
    const [produced, own] = figures(container);
    expect(produced).toHaveTextContent('Agents produced · this week');
    expect(value(produced)).toHaveTextContent('1280');
    expect(produced.querySelector('[data-change]')).toHaveTextContent('vs the week before');
    expect(produced).toHaveTextContent('Two hundred and fifty a working day.');
    expect(produced.querySelector('[data-chart="produced"]')).not.toBeNull();
    expect(produced.querySelector('[data-finding]')).toBeNull();
    expect(produced).not.toHaveTextContent('You decided');
    expect(own).toHaveTextContent('You decided · this week');
    expect(value(own)).toHaveTextContent('41');
    expect(own.querySelector('[data-change]')).toHaveTextContent('vs the week before');
    expect(own).toHaveTextContent('Nine a working day.');
    expect(own.querySelector('[data-finding]')).toHaveTextContent('All 41 inside a day');
    expect(own.querySelector('[data-chart="decided"]')).not.toBeNull();
    expect(own.querySelector('[data-chart="produced"]')).toBeNull();
  });

  it('has one foot and one set of actions for the card, outside both halves', () => {
    const { container } = render(two);
    expect(container.querySelectorAll('[data-foot]')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Export' })).toHaveLength(1);
    for (const half of figures(container)) {
      expect(half.querySelector('[data-foot]')).toBeNull();
      expect(half).not.toContainElement(screen.getByRole('button', { name: 'Export' }));
    }
  });

  it('lays the halves side by side from 672px of its own width, and one above the other below that', () => {
    // A container query, so the server draws the layout the browser keeps: the test reads the utilities, and a browser
    // measures the two layouts at the phase end.
    const { container } = render(two);
    expect(container.querySelector('section')!.className).toContain('@container');
    expect(container.querySelector('[data-figures]')!.className).toContain('@2xl:grid-cols-2');
  });

  it('reads each half\'s own point when the page points at one', () => {
    const { container } = render(<Meridian dates={weeks} day={weeks[1]}>{two}</Meridian>);
    const [produced, own] = figures(container);
    expect(value(produced)).toHaveTextContent('1000');
    expect(value(own)).toHaveTextContent('35');
    expect(container.querySelectorAll('[data-point]')).toHaveLength(2);
  });

  it('is one figure without a peer', () => {
    const { container } = render(<FeaturedMetric kicker="Requests · last 30 days" value={1280} format={plain} delta={0.062} />);
    expect(figures(container)).toHaveLength(1);
  });
});
