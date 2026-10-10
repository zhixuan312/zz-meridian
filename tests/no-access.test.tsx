// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '@/components/ui/empty-state';
import { NoAccess, noAccessCopy } from '@/views/no-access';

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
});
