import { Suspense } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const went = vi.hoisted(() => ({ to: [] as string[] }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: (to: string) => { went.to.push(to); }, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }),
}));

import { AppShell, useLeave } from '@/components/base/shell';
import { FormSection } from '@/components/patterns/form-section';

/** A control that leaves from code, as a workspace switch or a sign-out does. */
function Away() {
  const leave = useLeave();
  return <button type="button" onClick={() => leave(() => { went.to.push('/elsewhere'); })}>Go elsewhere</button>;
}
const page = async () => {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <AppShell rail={null} assistant={Promise.resolve(false)}>
          <FormSection title="Workspace" dirty onSave={() => {}} onDiscard={() => {}}><input aria-label="Name" defaultValue="Acme" /></FormSection>
          <Away />
        </AppShell>
      </Suspense>,
    );
  });
};
/** Whether the page asks the browser to warn before it unloads. */
const warns = () => { const closing = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(closing); return closing.defaultPrevented; };
const answer = async (name: 'Stay' | 'Leave') => {
  await screen.findByRole('dialog', { name: 'Leave without saving?' });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
};

beforeEach(() => { went.to.length = 0; });

describe('the browser\'s own warning, around the shell\'s question', () => {
  it('is asked for while something is unsaved', async () => {
    await page();
    expect(warns()).toBe(true);
  });

  it('is not asked for again once the person has chosen to leave: one question, not two', async () => {
    await page();
    fireEvent.click(screen.getByRole('button', { name: 'Go elsewhere' }));
    await answer('Leave');
    expect(went.to).toEqual(['/elsewhere']);
    // The move the person chose may end in a full page load (a sign-out, an address the router hands to the browser).
    expect(warns()).toBe(false);
  });

  it('is asked for again when the person stays', async () => {
    await page();
    fireEvent.click(screen.getByRole('button', { name: 'Go elsewhere' }));
    await answer('Stay');
    expect(warns()).toBe(true);
  });
});
