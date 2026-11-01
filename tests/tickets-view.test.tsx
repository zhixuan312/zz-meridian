import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/operations-tickets', useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh: navigation.refresh, push() {}, replace() {} }) }));
vi.mock('@/components/ui/toast', () => ({ toast: vi.fn() }));

import { TicketsView } from '@/views/tickets';
import { toast } from '@/components/ui/toast';

beforeEach(() => vi.clearAllMocks());

type Answer = { ok: true } | { ok: false; error: string };
const NOW = '2026-10-03T09:00:00.000Z';
const ticket = (id: string, title: string, state: string, assignee: string | null) => ({ id, title, service: 'Edge gateway', priority: 'normal', state, assigneeId: assignee ? 'members_2' : null, assignee, openedAt: '2026-10-01T09:00:00.000Z', updatedAt: '2026-10-02T09:00:00.000Z', summary: 'Seen twice this week.' });
const rows = [ticket('tickets_1', 'Gateway answers 502 under load', 'open', 'Jonas Weber'), ticket('tickets_2', 'Rotate the signing key', 'waiting', null), ticket('tickets_3', 'Retire the v0 endpoint', 'closed', 'Jonas Weber')];
const fine = async (): Promise<Answer> => ({ ok: true });
const view = (over: Record<string, unknown> = {}) => {
  const props = { rows, now: NOW, services: ['Edge gateway', 'Auth'], assignees: [{ id: 'members_2', name: 'Jonas Weber' }], createTicket: fine, updateTicket: fine, ...over } as unknown as Parameters<typeof TicketsView>[0];
  return render(<Tooltip.Provider><TicketsView {...props} /></Tooltip.Provider>);
};
/** The steps a row offers: its menu opened, and the names of what is in it. */
const stepsOf = async (title: string) => {
  const { unmount } = view();
  fireEvent.keyDown(screen.getByRole('button', { name: `Change state of ${title}` }), { key: 'Enter' });
  const names = within(await screen.findByRole('menu')).getAllByRole('menuitem').map((i) => i.textContent);
  unmount();
  return names;
};

describe('the tickets page, for someone who may not write', () => {
  it('shows every ticket and offers neither a new ticket nor a step', () => {
    const { container } = view({ may: { create: false, update: false } });
    expect(container.querySelectorAll('tbody tr').length).toBe(3);
    expect(screen.queryByRole('button', { name: 'New ticket' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Change state of / })).toBeNull();
  });
});

describe('the tickets page, for someone who may', () => {
  it("keeps each row's step on a phone, beside the title, and its state among the facts", () => {
    // A card keeps one status: two columns that both asked for it lost the step, so a ticket could not move on a phone.
    view();
    const step = screen.getByRole('button', { name: 'Change state of Gateway answers 502 under load' });
    expect(step.closest('td')!.getAttribute('data-mobile')).toBe('status');
    const row = step.closest('tr')!;
    expect([...row.querySelectorAll('td[data-mobile="fact"]')].map((c) => c.textContent).join(' ')).toMatch(/\bOpen\b/);
  });

  it('offers on each row only the steps its state allows', async () => {
    expect(await stepsOf('Gateway answers 502 under load')).toEqual(['Move to waiting', 'Move to closed']);
    expect(await stepsOf('Rotate the signing key')).toEqual(['Move to open', 'Move to closed']);
    expect(await stepsOf('Retire the v0 endpoint')).toEqual(['Move to open']);
  });

  it('sends the step once, for that ticket', async () => {
    const updateTicket = vi.fn(fine);
    view({ updateTicket });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Change state of Gateway answers 502 under load' }), { key: 'Enter' });
    await act(async () => { fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Move to closed' })); });
    expect(updateTicket.mock.calls).toEqual([['tickets_1', { state: 'closed' }]]);
  });

  it('says why a new ticket was refused inside the open form, and keeps what was typed', async () => {
    const createTicket = vi.fn(async (): Promise<Answer> => ({ ok: false, error: 'That service does not exist.' }));
    view({ createTicket });
    fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
    const form = await screen.findByRole('dialog');
    fireEvent.change(within(form).getByLabelText(/^Title/), { target: { value: 'Rotate the gateway certificate' } });
    await act(async () => { fireEvent.click(within(form).getByRole('button', { name: 'Create ticket' })); });
    expect(createTicket).toHaveBeenCalledTimes(1);
    expect(createTicket.mock.calls[0]).toEqual([expect.objectContaining({ title: 'Rotate the gateway certificate', service: 'Edge gateway', priority: 'normal', assigneeId: null })]);
    const open = await screen.findByRole('dialog');
    expect(within(open).getByRole('alert').textContent).toContain('That service does not exist.');
    expect((within(open).getByLabelText(/^Title/) as HTMLInputElement).value).toBe('Rotate the gateway certificate');
  });

  it('does not send a new ticket twice while the first is on its way, and closes the form when it is made', async () => {
    let made!: (a: Answer) => void;
    const createTicket = vi.fn(() => new Promise<Answer>((resolve) => { made = resolve; }));
    view({ createTicket });
    fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
    const form = await screen.findByRole('dialog');
    fireEvent.change(within(form).getByLabelText(/^Title/), { target: { value: 'Rotate the gateway certificate' } });
    await act(async () => { fireEvent.click(within(form).getByRole('button', { name: 'Create ticket' })); });
    await act(async () => { fireEvent.click(within(form).getByRole('button', { name: 'Create ticket' })); });
    expect(createTicket).toHaveBeenCalledTimes(1);
    await act(async () => { made({ ok: true }); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps Create ticket ready while a row is moving, which is not a ticket being made', async () => {
    const updateTicket = vi.fn(() => new Promise<Answer>(() => {}));
    view({ updateTicket });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Change state of Gateway answers 502 under load' }), { key: 'Enter' });
    await act(async () => { fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Move to closed' })); });
    expect(updateTicket).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'New ticket' }));
    const form = await screen.findByRole('dialog');
    expect(within(form).getByRole('button', { name: 'Create ticket' }).getAttribute('aria-busy')).toBeNull();
  });
});

describe('ticket creation without services', () => {
  it.each([true, false])('explains recovery at every available entrypoint, with an empty list: %s', (empty) => {
    const createTicket = vi.fn(fine);
    view({ rows: empty ? [] : rows, services: [], createTicket });
    const buttons = screen.getAllByRole('button', { name: 'New ticket' });
    expect(buttons).toHaveLength(empty ? 2 : 1);
    for (const button of buttons) {
      expect(button.getAttribute('aria-haspopup')).toBeNull();
      fireEvent.click(button);
      expect(screen.queryByRole('dialog')).toBeNull();
    }
    expect(createTicket).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'No services available',
      description: expect.stringMatching(/service.*administrator.*refresh/i),
      action: expect.objectContaining({ label: 'Refresh' }),
    }));
    const notice = vi.mocked(toast).mock.calls.at(-1)![0];
    notice.action!.onClick();
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it('withholds both controls and recovery details from someone who may not create', () => {
    view({ rows: [], services: [], may: { create: false, update: false } });
    expect(screen.queryByRole('button', { name: 'New ticket' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  it('can create against a service that arrives after the first render', async () => {
    const createTicket = vi.fn(fine);
    const props = { rows: [], now: NOW, services: [] as string[], assignees: [], createTicket, updateTicket: fine };
    const { rerender } = render(<TicketsView {...props} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'New ticket' })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<TicketsView {...props} services={['New gateway']} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'New ticket' })[0]);
    const form = await screen.findByRole('dialog');
    fireEvent.change(within(form).getByLabelText(/^Title/), { target: { value: 'Check the new gateway' } });
    await act(async () => { fireEvent.click(within(form).getByRole('button', { name: 'Create ticket' })); });
    expect(createTicket.mock.calls).toEqual([[expect.objectContaining({ title: 'Check the new gateway', service: 'New gateway' })]]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
