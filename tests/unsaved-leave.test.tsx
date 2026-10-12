import { Suspense, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const went = vi.hoisted(() => ({ to: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (to: string) => { went.to.push(to); }, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { AppShell, NavTrigger, useLeave } from '@/components/base/shell';
import { FormSection } from '@/components/patterns/form-section';

/** What the rail's link saw each time its own handler ran: whether the click had already been stopped. */
const own: boolean[] = [];
/**
 * A link as a router's link component is: it navigates in its own click handler unless the click was already prevented.
 * Its address is no page of this product, so it stays a plain anchor.
 */
const rail = <a href="/reports?range=30d" onClick={(e) => { own.push(e.defaultPrevented); }}>Reports</a>;

function Switcher() {
  const leave = useLeave();
  return <button type="button" onClick={() => leave(() => { went.to.push('/health'); })}>Switch workspace</button>;
}
function Page({ unsaved }: { unsaved: boolean }) {
  const [dirty, setDirty] = useState(unsaved);
  return (
    <>
      <NavTrigger />
      <FormSection title="Workspace" dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => setDirty(false)}>
        <input aria-label="Name" defaultValue="Acme" />
      </FormSection>
      <Switcher />
    </>
  );
}
/** A console page with one form section, a link in the rail and a control that navigates from code. */
const page = async (unsaved: boolean) => {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <AppShell rail={rail} assistant={Promise.resolve(false)}>
          <Page unsaved={unsaved} />
        </AppShell>
      </Suspense>,
    );
  });
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme Ltd' } });
};
const link = () => screen.getByRole('link', { name: 'Reports' });
// By role: one question at most is ever open, or this throws.
const asked = () => screen.queryByRole('dialog', { name: 'Leave without saving?' });
const answer = async (name: 'Stay' | 'Leave') => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })); }); };
/**
 * Follows the link as a browser would, and answers whether the click was stopped before the browser would have acted on
 * it. A click that reaches the document is judged there, and ended there, since jsdom cannot follow a link; one that
 * never reaches it is judged by whether its default was prevented on the way.
 */
const follow = (init?: MouseEventInit) => {
  let reached = false;
  let prevented = false;
  const last = (e: MouseEvent) => { reached = true; prevented = e.defaultPrevented; e.preventDefault(); };
  document.addEventListener('click', last);
  const allowed = fireEvent.click(link(), init);
  document.removeEventListener('click', last);
  return reached ? prevented : !allowed;
};

beforeEach(() => { went.to.length = 0; own.length = 0; });

describe('leaving a form that has unsaved changes', () => {
  it('asks before the link acts, and staying keeps the form and the address', async () => {
    await page(true);
    expect(follow()).toBe(true);
    // The link's own handler either never ran or found the click already stopped: a link that navigates itself did not.
    expect(own.filter((prevented) => !prevented)).toEqual([]);
    expect(asked()).not.toBeNull();
    await answer('Stay');
    expect(asked()).toBeNull();
    expect(went.to).toEqual([]);
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Acme Ltd');
  });

  it('goes where the link led, query and all, once the person chooses to leave', async () => {
    await page(true);
    follow();
    await answer('Leave');
    expect(went.to).toEqual(['/reports?range=30d']);
    expect(asked()).toBeNull();
  });

  it('asks the same of a link followed in the drawer', async () => {
    await page(true);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(follow()).toBe(true);
    expect(own.filter((prevented) => !prevented)).toEqual([]);
    expect(asked()).not.toBeNull();
    expect(went.to).toEqual([]);
  });

  it('asks the same of a navigation started from code, such as choosing another workspace', async () => {
    await page(true);
    fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
    expect(asked()).not.toBeNull();
    expect(went.to).toEqual([]);
    await answer('Stay');
    expect(went.to).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
    await answer('Leave');
    expect(went.to).toEqual(['/health']);
  });

  it('stops the tab from closing or reloading without a word', async () => {
    await page(true);
    const closing = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(closing);
    expect(closing.defaultPrevented).toBe(true);
  });

  it('stops asking the moment the changes are discarded', async () => {
    await page(true);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Discard' })); });
    expect(follow()).toBe(false);
    expect(own).toEqual([false]);
    expect(asked()).toBeNull();
    const closing = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(closing);
    expect(closing.defaultPrevented).toBe(false);
  });
});

describe('leaving a page with nothing unsaved', () => {
  it('asks nothing: a link is left to itself and to the browser, and code runs at once', async () => {
    await page(false);
    expect(follow()).toBe(false);
    expect(own).toEqual([false]);
    expect(asked()).toBeNull();
    expect(went.to).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
    expect(went.to).toEqual(['/health']);
    const closing = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(closing);
    expect(closing.defaultPrevented).toBe(false);
  });
});

describe('a link that opens elsewhere', () => {
  it('is never held back, unsaved changes or not: a new tab leaves this one as it is', async () => {
    await page(true);
    expect([follow({ metaKey: true }), follow({ ctrlKey: true }), follow({ shiftKey: true })]).toEqual([false, false, false]);
    expect(own).toEqual([false, false, false]);
    expect(asked()).toBeNull();
    expect(went.to).toEqual([]);
  });
});
