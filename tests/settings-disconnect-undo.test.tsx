import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type Toast = { title: string; action?: { label: string; onClick: () => void } };
const toasts = vi.hoisted(() => [] as Toast[]);
vi.mock('@/components/ui/toast', () => ({ toast: (t: Toast) => { toasts.push(t); } }));

import { SettingsBody } from '@/views/settings';
import { CONNECTED_HOSTS } from '@/data/sample';

/** The connected hosts, in the order the list shows them. */
const names = () => screen.queryAllByRole('button', { name: 'Disconnect' }).map((b) => b.closest('li')!.querySelector('p')!.textContent!.replace(/Chat client|Internal agent$/, ''));

/** The Disconnect control sits in the Agents section, which every person keeps, so the page is rendered for someone who may do everything. */
const may = { workspaceRead: true, workspaceUpdate: true, workspaceRemove: true };

describe('Disconnect, then Undo', () => {
  it('puts the host back where it was, and a second press does not add it twice', async () => {
    render(<SettingsBody may={may} />);
    const order = CONNECTED_HOSTS.map((h) => h.name);
    expect(names()).toEqual(order);
    fireEvent.click(screen.getAllByRole('button', { name: 'Disconnect' })[0]);
    await waitFor(() => expect(names()).toEqual(order.slice(1)));
    const undo = toasts.at(-1)!.action!;
    await act(async () => { undo.onClick(); undo.onClick(); });
    expect(names()).toEqual(order);
  });
});
