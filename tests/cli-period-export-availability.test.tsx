// Sample page coverage: products replace these routes.
import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportButton } from '@/components/patterns/export-button';
import { toast } from '@/components/ui/toast';
import HomePage from '../app/(dashboard)/(home)/page';
import RevenuePage from '../app/(dashboard)/business/page';
import UsagePage from '../app/(dashboard)/usage/page';

const source = vi.hoisted(() => ({ available: false }));
vi.mock('@/data/access', () => ({ gate: async () => null, gatedMetadata: vi.fn() }));
vi.mock('@/logic/tools', () => {
  const read = async () => ({ data: { period: '30d', series: [], totals: source.available ? {} : null, days: source.available ? { series: [] } : null } });
  return { homeTool: { read }, revenueTool: { read }, usageTool: { read } };
});
vi.mock('@/components/ui/toast', () => ({ toast: vi.fn() }));

beforeEach(() => { source.available = false; vi.clearAllMocks(); });

// Resolve only the page's actions boundary. The read and export wiring are real;
// unrelated chart and title boundaries need not render to exercise this action.
async function exportOf(page: typeof HomePage) {
  const frame = await page() as ReactElement<{ actions: ReactElement<{ children: ReactElement<{ searchParams: Promise<{ period?: string }> }> }> }>;
  const action = frame.props.actions.props.children;
  const resolve = action.type as (props: typeof action.props) => Promise<ReactElement<{ children: ReactNode }>>;
  const controls = await resolve(action.props);
  const button = Children.toArray(controls.props.children).find((child) => isValidElement(child) && child.type === ExportButton);
  if (!isValidElement(button)) throw new Error('The page did not offer its export action');
  render(button);
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
}

describe.each([['Home', HomePage], ['Revenue', RevenuePage], ['Usage', UsagePage]] as const)('%s export availability', (_name, page) => {
  it('keeps a failed period read distinct from an empty period', async () => {
    await exportOf(page);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'critical', title: 'Export unavailable' }));
  });

  it('recognizes a successfully read period with no complete days as empty', async () => {
    source.available = true;
    await exportOf(page);
    expect(toast).toHaveBeenCalledWith({ tone: 'neutral', title: 'No days to export' });
  });
});
