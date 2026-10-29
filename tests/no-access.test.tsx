// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '@/components/ui/empty-state';
import { chromeAccess } from '@/data/access';
import { NoAccess, noAccessCopy } from '@/views/no-access';

/** The links a piece of markup holds, each as its address and its words. */
const linksOf = (html: string) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]*>/g, '').trim() }));

/** The chrome `gate` hands the refusal: resolved for the reader, and null when who they are cannot be told. */
const chrome = () => chromeAccess().catch(() => null);

/**
 * The template's own repository: the Atlas is still here. A project brought in with `adopt` or `create` has it removed
 * and its rail is its own, so the destinations below are the template's and not that project's — asserting them in a
 * product fails that product's gate for a page that is right, which is why the other two files that pin the template's
 * rail guard themselves the same way.
 */
const TEMPLATE = fs.existsSync(path.resolve(import.meta.dirname, '../app/system'));

beforeEach(() => { jar.value = 'members_12'; });

describe('the no-access state', () => {
  it('is its own kind: a lock mark, a neutral disc, no alert, and data-no-access', () => {
    const html = renderToStaticMarkup(<EmptyState kind="no-access" title="You don't have access to API keys">Owners, Admins, Members and Key managers can open it.</EmptyState>);
    expect(html).toContain('data-no-access');
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('bg-fill-track');
    expect(html).not.toContain('bg-critical-tint');
  });

  it('tells the person who can open it, generated from the role table', () => {
    const keys = noAccessCopy('keys:read', 'API keys');
    expect(keys.title).toBe("You don't have access to API keys");
    expect(keys.description).toBe('Owners, Admins, Members and Key managers can open it. Ask an Owner or Admin for access.');
    expect(noAccessCopy('members:read', 'Members').description).toBe('Owners, Admins and Members can open it. Ask an Owner or Admin for access.');
  });

  it('says so, and names no role, when no single role satisfies the need', () => {
    // The sample's Owner holds every grant, so no valid need reaches this branch; a need naming a grant no role holds
    // does, and it is the branch the spec asks for. A second add-on would let a valid need reach it too.
    const both = noAccessCopy({ allOf: ['billing:read', 'keys:read'] }, 'Keys and billing');
    expect(both.description).toBe('Access needs a main role together with an add-on. Ask an Owner or Admin for access.');
    expect(both.description).not.toContain('Key manager');
    expect(both.description).not.toContain('Owner,');
  });

  it('asks an administrator when no role may change members', async () => {
    // A role table where nobody holds members:update, as a product that edits GRANTS can write.
    vi.resetModules();
    vi.doMock('@/data/roles', async (orig) => {
      const real = await orig<typeof import('@/data/roles')>();
      return { ...real, whoCan: (need: Parameters<typeof real.whoCan>[0]) => (need === 'members:update' ? [] : real.whoCan(need)) };
    });
    const { noAccessCopy: copy } = await import('@/views/no-access');
    expect(copy('keys:read', 'API keys').description).toMatch(/ Ask an administrator for access\.$/);
    vi.doUnmock('@/data/roles');
  });
  it('renders the feature through the page frame', async () => {
    const html = renderToStaticMarkup(NoAccess({ feature: 'keys', access: await chrome() }));
    expect(html).toContain('API keys');
    expect(html).toContain('data-no-access');
  });

  it('offers one link, named for where it leads, to the first destination of its own workspace the person may open', async (ctx) => {
    if (!TEMPLATE) ctx.skip('this project replaced the template\u2019s pages: its rail is its own, and these destinations are the template\u2019s');
    expect(linksOf(renderToStaticMarkup(NoAccess({ feature: 'keys', access: await chrome() })))).toEqual([{ href: '/engineering', text: 'Go to Now' }]);
    expect(linksOf(renderToStaticMarkup(NoAccess({ feature: 'members', access: await chrome() })))).toEqual([{ href: '/', text: 'Go to Home' }]);
  });

  it('offers Main\'s home when who the person is cannot be told', async () => {
    jar.value = 'nobody';
    expect(linksOf(renderToStaticMarkup(NoAccess({ feature: 'keys', access: await chrome() })))).toEqual([{ href: '/', text: 'Go to Main' }]);
  });

  it('offers no link at all to somebody who may open nothing, because every one of them refuses them in turn', async () => {
    // A person whose grants open no destination: the way out would be Main's home, and Main refuses them too, so the
    // sentence naming who to ask is the whole answer rather than a loop.
    const html = renderToStaticMarkup(NoAccess({ feature: 'keys', access: { only: [], user: { name: 'Nobody', role: 'Viewer' } } }));
    expect(linksOf(html)).toEqual([]);
    expect(html).toContain('data-no-access');
    expect(html).toContain('for access');
  });
});
