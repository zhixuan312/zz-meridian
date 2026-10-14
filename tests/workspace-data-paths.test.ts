// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
const cache = vi.hoisted(() => ({ tags: [] as string[] }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: (t: string) => { cache.tags.push(t); }, revalidateTag: (t: string) => { cache.tags.push(t); }, revalidatePath: () => {}, refresh: () => {} }));

import { createTicket, updateTicket } from '../app/(dashboard)/operations-tickets/actions';
import { collectionFor, resolveAccess } from '@/data/access';
import { collections } from '@/data/collections';
import { collectionTag, read } from '@/data/read';
import { readTickets } from '@/data/tickets';
import type { HomeData } from '@/views/home-context';
import { ticketCounts } from '@/views/tickets-context';
import { viewTools } from '@/views/tools';

const ROOT = path.resolve(import.meta.dirname, '..');
const PEOPLE = { member: 'members_4', viewer: 'members_12', nobody: 'members_999' };
const TAG = collectionTag('demo', 'tickets');
const draft = { title: 'Rotate the gateway certificate', service: 'Edge gateway', priority: 'high' as const, assigneeId: 'members_2', summary: 'It expires on the 14th.' };
const tool = viewTools.find((t) => t.name === 'tickets')!;
const stored = async () => (await collections.find((c) => c.name === 'tickets')!.query({})).rows as Record<string, unknown>[];
const fact = async (label: string) => (await tool.read({})).context.facts.find((f) => f.label === label)?.value;
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

beforeEach(() => { jar.value = PEOPLE.member; cache.tags.length = 0; });

describe('a ticket created from the page', () => {
  it('is in the next read, in the counts and in what the assistant is told, and the cached reads are dropped', async () => {
    const before = ticketCounts((await readTickets()).rows);
    expect(await fact('Open tickets')).toBe(String(before.open));
    expect(await createTicket(draft)).toEqual({ ok: true });
    const after = await readTickets();
    expect(ticketCounts(after.rows)).toEqual({ ...before, open: before.open + 1 });
    expect(after.rows.some((t) => t.title === draft.title && t.state === 'open')).toBe(true);
    expect(await fact('Open tickets')).toBe(String(before.open + 1));
    expect(cache.tags).toContain(TAG);
  });

  it('answers a refusal as a value the form can show, and writes nothing', async () => {
    const before = (await stored()).length;
    for (const bad of [{ ...draft, title: '  ' }, { ...draft, service: 'No such service' }, { ...draft, assigneeId: 'members_999' }]) {
      const answer = await createTicket(bad);
      expect(answer.ok, bad.title + bad.service).toBe(false);
      if (!answer.ok) expect(answer.error.trim().length).toBeGreaterThan(0);
    }
    expect((await stored()).length).toBe(before);
    expect(cache.tags).not.toContain(TAG);
  });
});

describe('a ticket created from the page, as Home counts it', () => {
  it('raises the open tickets of Home\'s Engineering card at its next read', async () => {
    const home = viewTools.find((t) => t.name === 'home')!;
    const open = async () => Number(((await home.read({ period: '30d' })).data as HomeData).engineering.lines.find((l) => l.label === 'Tickets open')!.value);
    const before = await open();
    expect(await createTicket({ ...draft, title: 'Counted by Home' })).toEqual({ ok: true });
    expect(await open()).toBe(before + 1);
  });
});

describe('a ticket changed from the page', () => {
  const made = async () => {
    await createTicket({ ...draft, title: `Probe ${Math.random().toString(36).slice(2)}` });
    return String((await stored()).at(-1)!.id);
  };

  it('moves the counts, the read and what the assistant is told together', async () => {
    const id = await made();
    const before = ticketCounts((await readTickets()).rows);
    cache.tags.length = 0;
    expect(await updateTicket(id, { state: 'waiting' })).toEqual({ ok: true });
    expect(ticketCounts((await readTickets()).rows)).toEqual({ ...before, open: before.open - 1, waiting: before.waiting + 1 });
    expect(await fact('Open tickets')).toBe(String(before.open - 1));
    expect(await fact('Waiting tickets')).toBe(String(before.waiting + 1));
    expect(cache.tags).toContain(TAG);
  });

  it('refuses the same step whether it comes from the page or from an agent\'s tool, and neither changes the ticket', async () => {
    const id = await made();
    expect(await updateTicket(id, { state: 'closed' })).toEqual({ ok: true });
    const fromThePage = await updateTicket(id, { state: 'waiting' });
    expect(fromThePage.ok).toBe(false);
    // An agent's tool writes through the collection it is handed, which is this one.
    const handed = collectionFor(await resolveAccess(), 'tickets');
    await expect(handed.update!([id], { state: 'waiting' })).rejects.toThrow();
    expect((await stored()).find((t) => t.id === id)!.state).toBe('closed');
  });

  it('is refused to a Viewer by the action, however it is called', async () => {
    const id = await made();
    jar.value = PEOPLE.viewer;
    cache.tags.length = 0;
    expect((await createTicket(draft)).ok).toBe(false);
    expect((await updateTicket(id, { state: 'closed' })).ok).toBe(false);
    expect((await stored()).find((t) => t.id === id)!.state).toBe('open');
    expect(cache.tags).not.toContain(TAG);
  });
});

describe('what a reader is shown of a ticket', () => {
  it('counts every ticket, not a page of them', async () => {
    const counts = ticketCounts((await readTickets()).rows);
    expect(counts.open + counts.waiting + counts.closed).toBe((await stored()).length);
  });

  it('names who a ticket is assigned to, for a Viewer too, without handing them the members', async () => {
    jar.value = PEOPLE.viewer;
    const { rows } = await readTickets();
    const members = (await collections.find((c) => c.name === 'members')!.query({})).rows as Record<string, unknown>[];
    for (const t of rows) expect(t.assignee, String(t.id)).toBe(t.assigneeId === null ? null : members.find((m) => m.id === t.assigneeId)!.name);
    expect(rows.some((t) => t.assignee !== null) && rows.some((t) => t.assignee === null)).toBe(true);
    await expect(read('members')).rejects.toThrow();
  });

  it('is told to the assistant from the same read, and to nobody without a session', async () => {
    const { context } = await tool.read({});
    expect(context).toMatchObject({ view: 'tickets', address: '/operations-tickets' });
    const counts = ticketCounts((await readTickets()).rows);
    expect(await fact('Closed tickets')).toBe(String(counts.closed));
    jar.value = PEOPLE.nobody;
    await expect(tool.read({})).rejects.toBeTruthy();
    await expect(readTickets()).rejects.toBeTruthy();
  });
});

describe('the page itself', () => {
  it('is gated, reads through the shared read, and follows changes made elsewhere', () => {
    const page = source('app/(dashboard)/operations-tickets/page.tsx');
    expect(page).toMatch(/gate\('tickets'\)/);
    expect(page).toMatch(/\breadTickets\(/);
    expect(source('src/views/tickets.tsx')).toMatch(/useLive\(\[\s*'tickets'\s*\]\)/);
  });
});
