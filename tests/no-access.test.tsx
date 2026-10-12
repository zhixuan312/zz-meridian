// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'zz_meridian_view_as' && jar.value !== undefined ? { name: n, value: jar.value } : undefined), set: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, refresh: () => {} }));
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '@/components/ui/empty-state';
import { NoAccess, noAccessCopy } from '@/views/no-access';

/** The links a piece of markup holds, each as its address and its words. */
const linksOf = (html: string) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].replace(/<[^>]*>/g, '').trim() }));

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

  it('renders the feature through the page frame', async () => {
    const html = renderToStaticMarkup(await NoAccess({ feature: 'keys' }));
    expect(html).toContain('API keys');
    expect(html).toContain('data-no-access');
  });

  it('offers one link, named for where it leads, to the first destination of its own workspace the person may open', async () => {
    expect(linksOf(renderToStaticMarkup(await NoAccess({ feature: 'keys' })))).toEqual([{ href: '/health', text: 'Go to Operations' }]);
    expect(linksOf(renderToStaticMarkup(await NoAccess({ feature: 'members' })))).toEqual([{ href: '/', text: 'Go to Overview' }]);
  });

  it('offers Main\'s home when who the person is cannot be told', async () => {
    jar.value = 'nobody';
    expect(linksOf(renderToStaticMarkup(await NoAccess({ feature: 'keys' })))).toEqual([{ href: '/', text: 'Go to Main' }]);
  });
});
