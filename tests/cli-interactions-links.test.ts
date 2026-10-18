// @vitest-environment node
// The presses follow a link as a browser does: resolved against its page. They skipped every href not starting with
// /, so a relative link on the Atlas's Contributing page that answered 404 passed (fixed in 0.17.0).
import { describe, expect, it } from 'vitest';
import { linkPath } from '../scripts/lib/links.ts';

const page = 'http://127.0.0.1:3100/system/system/contributing';

describe('linkPath', () => {
  it('keeps a root-relative link', () => expect(linkPath('/system/start/start-a-dashboard', page)).toBe('/system/start/start-a-dashboard'));
  it('resolves a relative link against its page', () => {
    expect(linkPath('docs/testing.md', page)).toBe('/system/system/docs/testing.md');
    expect(linkPath('../start/assistant', page)).toBe('/system/start/assistant');
  });
  it('keeps the query and drops the fragment', () => expect(linkPath('/requests?status=open#top', page)).toBe('/requests?status=open'));
  it('follows an absolute link to the same site', () => expect(linkPath('http://127.0.0.1:3100/keys', page)).toBe('/keys'));
  it("leaves what is not this site's page", () => {
    for (const href of ['https://example.com/x', '//example.com/x', 'mailto:a@b.c', 'tel:123', 'javascript:void(0)', '#anchor']) expect(linkPath(href, page)).toBeNull();
  });
});
