// @vitest-environment node
// A server component renders Button with no client runtime, and React's server renderer refuses a function anywhere in
// the props it returns ("Event handlers cannot be passed to Client Component props"), failing the whole view (#134).
// `react-dom/server` drops a handler silently, so it cannot see that; this walks the tree Button returns instead.
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Button, type ButtonProps } from '@/components/ui/button';

/** What Button returns for `props`, as React receives it: a client component's props object is what React checks. */
function tree(props: ButtonProps): ReactElement<Record<string, unknown>> {
  // `forwardRef` keeps the render function on `.render`; React 19's server renderer calls exactly that, so its return
  // value is the tree React checks for handlers.
  const inner: unknown = Button;
  if (typeof inner !== 'object' || inner === null || !('render' in inner)) throw new Error('Button is not a forwardRef component');
  const render = inner.render;
  if (typeof render !== 'function') throw new Error('Button has no render function');
  const withRef: ButtonProps & { ref: null } = { ...props, ref: null };
  return (render as (p: ButtonProps, ref: null) => ReactNode)(withRef, null) as ReactElement<Record<string, unknown>>;
}

/** Every prop whose value is a function, named by the element it sits on: what a server render refuses. */
function functions(node: ReactNode, path = 'Button'): string[] {
  return Children.toArray(node).flatMap((child, i) => {
    if (child === null || typeof child !== 'object') return [];
    if (!isValidElement(child)) return [];
    const element = child as ReactElement<Record<string, unknown>>;
    const tag = typeof element.type === 'string' ? element.type : (element.type as { displayName?: string }).displayName ?? path;
    const here = `${path} > ${tag}[${i}]`;
    const own = Object.entries(element.props as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => `${here}.${name}`);
    return [...own, ...functions((element.props as { children?: ReactNode }).children, here)];
  });
}

describe('Button rendered where no client runtime exists', () => {
  it.each([
    ['disabled', { disabled: true }],
    ['busy', { busy: true }],
    ['disabled asChild', { asChild: true, disabled: true }],
    ['busy asChild', { asChild: true, busy: true }],
  ] satisfies [string, ButtonProps][])('hands React no handler while %s', (_state, state) => {
    // `asChild` clones its child, so this one is given a child the way a page writes it.
    const props: ButtonProps = state;
    const element = tree(props.asChild ? { ...props, children: <a href="#later">Later</a> } : { ...props, children: 'Later' });
    expect(functions(element)).toEqual([]);
  });

  it('still blocks the press of a native button with `disabled` alone', () => {
    const button = tree({ disabled: true, children: 'Later' });
    expect(button.props.disabled).toBe(true);
    expect(button.props['aria-disabled']).toBe(true);
    expect(button.props.onClick).toBeUndefined();
  });

  it('blocks an asChild child a server render cannot disable, with a class rather than a handler', () => {
    const slot = tree({ asChild: true, disabled: true, children: <a href="#later">Later</a> });
    expect(slot.props.className).toContain('pointer-events-none');
    expect((slot.props.children as ReactElement<{ tabIndex?: number }>).props.tabIndex).toBe(-1);
  });
});
