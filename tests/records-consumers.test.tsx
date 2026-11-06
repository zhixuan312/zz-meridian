import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Records } from '@/components/templates/records';
import { Tooltip } from 'radix-ui';
import { requestsQuery } from '@/data/requests';
import { hasSample } from './sample-present';

// The records are the sample's own request log; a product that replaced the sample has none, so the cases over it are
// not applicable there rather than failing on an absent module (#131).
type Sample = typeof import('@/system/fixtures/sample');
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/sample.ts', import.meta.url).pathname)) as Sample
  : null;
const REQUESTS = sample?.REQUESTS ?? [];
import { RequestsView } from '@/views/requests';
import type { RequestsData } from '@/logic/requests-context';

describe('the summary a page hands the records template', () => {
  const tiles = (summary: Parameters<typeof Records>[0]['summary']) => render(<Records summary={summary}><table /></Records>).container.querySelector('[data-split="tiles"]');

  it('is its tiles, whether they come as a fragment, as an array or as one node', () => {
    const fragment = tiles(<><p>Requests</p><p>Error rate</p><p>Latency</p></>)!;
    expect(fragment.children.length).toBe(3);
    expect(tiles([<p key="a">Requests</p>, <p key="b">Error rate</p>])!.children.length).toBe(2);
    expect(tiles(<p>Requests</p>)!.children.length).toBe(1);
  });

  it('draws no row for a fragment with nothing in it', () => {
    expect(tiles(<></>)).toBeNull();
    expect(tiles(undefined)).toBeNull();
  });
});

it.skipIf(!sample)('draws the request summary and each supplied record', () => {
  const { state } = requestsQuery({});
  const summary: RequestsData['summary'] = { count: 0, errorShare: 0, p95: 0, buckets: { count: [], errors: [], p95: [] }, deltas: { count: null, errors: null, p95: null }, halves: { before: 0, after: 0 }, span: null, common: { all: { count: 0, route: null, customer: null, region: null }, errors: { count: 0, route: null, customer: null, region: null } }, rows: 0, partial: false };
  const { container } = render(<Tooltip.Provider><RequestsView rows={REQUESTS.slice(0, 5)} total={REQUESTS.length} summary={summary} state={state} pageSize={5} updatedAt="2026-10-05T08:56:00.000Z" now="2026-10-05T09:00:00.000Z" /></Tooltip.Provider>);
  expect(container.querySelectorAll('[data-split="tiles"] > *').length).toBe(3);
  expect(container.querySelectorAll('tbody tr').length).toBe(5);
});

