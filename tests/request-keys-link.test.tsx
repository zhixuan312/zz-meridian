// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The More menu draws its items only when it is open, so the test reads what the page hands it.
const handed = vi.hoisted(() => ({ more: [] as { label: string }[] }));
vi.mock('@/components/patterns/detail-head', async (orig) => {
  const real = await orig<typeof import('@/components/patterns/detail-head')>();
  return { ...real, detailHead: (p: Parameters<typeof real.detailHead>[0]) => { handed.more = p.more ?? []; return real.detailHead(p); } };
});

import { RequestView } from '@/views/request';

const view = (mayOpenKeys: boolean) => {
  renderToStaticMarkup(<RequestView request={{ id: 'req_1', status: 200 } as never} trace={[]} payloads={{ request: null, response: '{}' }} routeP95={null} now="2026-10-04T00:00:00.000Z" mayOpenKeys={mayOpenKeys} replay={async (id: string) => ({ ok: true as const, id, status: 200 })} />);
  return handed.more.map((a) => a.label);
};

describe("the request page's More menu", () => {
  it('leads to API keys only for someone who may open them', () => {
    expect(view(true)).toContain('Open API keys');
    expect(view(false)).not.toContain('Open API keys');
  });
});
