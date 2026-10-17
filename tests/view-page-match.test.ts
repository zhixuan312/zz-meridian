// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { viewAt } from '@/lib/shared-context';

/** Whether a view on `route` is the page at `path`. */
const rendersAt = (route: string, path: string) => viewAt([{ page: route }], path) !== undefined;

/**
 * The assistant hands a page's prepared query on every address that page renders (issue #40): a view's `page` matches
 * the address the panel sends the way Next.js matches the route, catch-alls included.
 */
describe('the page a view renders, matched as Next.js matches it', () => {
  it('a static route is its own address and no other', () => {
    expect(rendersAt('/', '/')).toBe(true);
    expect(rendersAt('/', '/requests')).toBe(false);
    expect(rendersAt('/requests', '/requests')).toBe(true);
    expect(rendersAt('/requests', '/requests/r_1')).toBe(false);
    expect(rendersAt('/requests', '/')).toBe(false);
  });

  it('a [name] segment is any one segment', () => {
    expect(rendersAt('/customers/[id]', '/customers/c_1')).toBe(true);
    expect(rendersAt('/customers/[id]', '/customers')).toBe(false);
    expect(rendersAt('/customers/[id]', '/customers/c_1/edit')).toBe(false);
    expect(rendersAt('/customers/[id]', '/customers/')).toBe(false);
    expect(rendersAt('/customers/[id]', '/members/c_1')).toBe(false);
  });

  it('a [...name] segment is one or more of the segments left', () => {
    for (const path of ['/docs/a', '/docs/a/b', '/docs/a/b/c']) expect(rendersAt('/docs/[...path]', path), path).toBe(true);
    expect(rendersAt('/docs/[...path]', '/docs')).toBe(false);
    expect(rendersAt('/docs/[...path]', '/docs/a//b')).toBe(false);
    expect(rendersAt('/docs/[...path]', '/guides/a/b')).toBe(false);
    expect(rendersAt('/[team]/docs/[...path]', '/acme/docs/a/b')).toBe(true);
    expect(rendersAt('/[team]/docs/[...path]', '/acme/guides/a/b')).toBe(false);
  });

  it('a [[...name]] segment is zero or more of the segments left', () => {
    for (const path of ['/docs', '/docs/a', '/docs/a/b']) expect(rendersAt('/docs/[[...path]]', path), path).toBe(true);
    expect(rendersAt('/docs/[[...path]]', '/')).toBe(false);
    expect(rendersAt('/docs/[[...path]]', '/guides')).toBe(false);
    expect(rendersAt('/[[...path]]', '/')).toBe(true);
    expect(rendersAt('/[[...path]]', '/a/b')).toBe(true);
  });

  it('where several views match, the one Next.js renders is chosen', () => {
    const views = [{ page: '/docs/[[...path]]' }, { page: '/docs/[...path]' }, { page: '/docs/[id]' }, { page: '/docs/intro' }];
    expect(viewAt(views, '/docs/intro')?.page).toBe('/docs/intro');
    expect(viewAt(views, '/docs/a')?.page).toBe('/docs/[id]');
    expect(viewAt(views, '/docs/a/b')?.page).toBe('/docs/[...path]');
    expect(viewAt(views, '/docs')?.page).toBe('/docs/[[...path]]');
    expect(viewAt(views, '/guides')).toBeUndefined();
    const twice = [{ page: '/docs/[...path]', name: 'first' }, { page: '/docs/[...path]', name: 'second' }];
    expect(viewAt(twice, '/docs/a/b')?.name).toBe('first');
  });
});
