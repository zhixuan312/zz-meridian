// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));

import { removeMember } from '../app/(dashboard)/members/actions';
import { createTicket } from '../app/(dashboard)/operations-tickets/actions';
import { readAlerts } from '@/data/alerts';
import { readTickets } from '@/data/tickets';
import { ticketsContext } from '@/logic/tickets-context';

beforeEach(() => { jar.value = 'members_1'; });

describe('a ticket whose owner has left the workspace', () => {
  it('has no owner everywhere: on the page, in what the assistant is told, and in the bell', async () => {
    const title = `Orphan probe ${Math.random().toString(36).slice(2)}`;
    expect(await createTicket({ title, service: 'Edge gateway', priority: 'high', assigneeId: 'members_4', summary: '' })).toEqual({ ok: true });
    // Owned: the page names the owner and the bell is quiet about it.
    expect((await readTickets()).rows.find((t) => t.title === title)!.assignee).toBeTruthy();
    expect((await readAlerts()).alerts.some((a) => a.title.includes(title))).toBe(false);

    expect(await removeMember('members_4')).toEqual({ ok: true });
    const { rows, observedAt } = await readTickets();
    expect(rows.find((t) => t.title === title)!.assignee).toBeNull();
    const told = ticketsContext(rows, observedAt, { q: '', state: 'all', priority: 'all' });
    expect(told.insights.some((i) => /no owner/.test(i.text) && i.text.includes(title))).toBe(true);
    // The bell judges it as the page does, by whether anybody is there to own it.
    expect((await readAlerts()).alerts.some((a) => a.title.includes(title))).toBe(true);
  });
});
