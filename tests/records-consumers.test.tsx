import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { Tooltip } from 'radix-ui';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

// One implementation, watched: every render of the template passes through this count, whoever asked for it.
const seen = vi.hoisted(() => ({ renders: 0 }));
vi.mock('@/components/templates/records', async (original) => {
  const actual = await original<typeof import('@/components/templates/records')>();
  type Props = Parameters<typeof actual.Records>[0];
  return { ...actual, Records: (props: Props) => { seen.renders += 1; return actual.Records(props); } };
});

import { Records } from '@/components/templates/records';
import type { MemberRowAccess } from '@/data/member-mutations';
import { requestsQuery } from '@/data/requests';
import { ADD_ONS, MAIN_ROLES } from '@/data/roles';
import { REQUESTS } from '@/system/fixtures/sample';
import { MEMBERS } from '@/system/fixtures/sample-members';
import { API_KEYS } from '@/system/fixtures/sample-records';
import { KeysView } from '@/views/keys';
import { MembersView } from '@/views/members';
import type { ActionResult } from '@/lib/collection';
import { RequestsView } from '@/views/requests';
import type { RequestsData } from '@/logic/requests-context';

const ROOT = path.resolve(import.meta.dirname, '..');
const NOW = '2026-10-05T09:00:00.000Z';
const source = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
/** What a view draws, and how many times it went through the template to draw it. */
const drawn = (view: ReactElement) => {
  seen.renders = 0;
  const { container } = render(<Tooltip.Provider>{view}</Tooltip.Provider>);
  return { template: container.querySelector('[data-template="records"]'), renders: seen.renders };
};

describe('the summary a page hands the records template', () => {
  const tiles = (summary: Parameters<typeof Records>[0]['summary']) => render(<Records summary={summary}><table /></Records>).container.querySelector('[data-split="tiles"]');

  it('is its tiles, whether they come as a fragment, as an array or as one node', () => {
    const three = [<p key="a">Requests</p>, <p key="b">Error rate</p>, <p key="c">Latency</p>];
    const fragment = tiles(<><p>Requests</p><p>Error rate</p><p>Latency</p></>)!;
    expect(fragment.children.length).toBe(3);
    // The row sizes its columns by counting its children: a fragment's three tiles get the row three tiles get.
    expect(fragment.className).toBe(tiles(three)!.className);
    expect(tiles([<p key="a">Requests</p>, <p key="b">Error rate</p>])!.children.length).toBe(2);
    expect(tiles(<p>Requests</p>)!.children.length).toBe(1);
  });

  it('draws no row for a fragment with nothing in it', () => {
    expect(tiles(<></>)).toBeNull();
    expect(tiles(undefined)).toBeNull();
  });
});

describe('the pages that list records are built from the template', () => {
  it('Requests: its three tiles are the summary and its table the records', () => {
    const { state } = requestsQuery({});
    const summary: RequestsData['summary'] = { count: 0, errorShare: 0, p95: 0, buckets: { count: [], errors: [], p95: [] }, deltas: { count: null, errors: null, p95: null }, halves: { before: 0, after: 0 }, span: null, common: { all: { count: 0, route: null, customer: null, region: null }, errors: { count: 0, route: null, customer: null, region: null } }, rows: 0, partial: false };
    const { template, renders } = drawn(<RequestsView rows={REQUESTS.slice(0, 5)} total={REQUESTS.length} summary={summary} state={state} pageSize={5} updatedAt="2026-10-05T08:56:00.000Z" now={NOW} />);
    expect(renders).toBe(1);
    expect(template).not.toBeNull();
    expect(template!.querySelectorAll('[data-split="tiles"] > *').length).toBe(3);
    expect(template!.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('API keys: no summary, and the line about rotating keys stays under the table', () => {
    const { template, renders } = drawn(<KeysView rows={API_KEYS} now={NOW} createKey={async () => ({ ok: false, error: 'unused' })} revokeKey={async () => ({ ok: true })} />);
    expect(renders).toBe(1);
    expect(template).not.toBeNull();
    expect(template!.querySelector('[data-split="tiles"]')).toBeNull();
    const table = template!.querySelector('table')!;
    const caption = [...template!.querySelectorAll('p')].find((p) => /never expire/i.test(p.textContent ?? ''))!;
    expect(table.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Members: no summary, the table, then who may do what', () => {
    const ok = async (): Promise<ActionResult> => ({ ok: true });
    const access: Record<string, MemberRowAccess> = Object.fromEntries(MEMBERS.map((m) => [m.id, { changeRole: true, suspend: m.status === 'Active', reactivate: m.status === 'Suspended', remove: true, roles: MAIN_ROLES, addOns: ADD_ONS }]));
    const { template, renders } = drawn(<MembersView rows={MEMBERS} now={NOW} actions={{ invite: ok, assignRole: ok, setStatus: ok, remove: ok } as never} access={access} roles={MAIN_ROLES} />);
    expect(renders).toBe(1);
    expect(template).not.toBeNull();
    expect(template!.querySelector('[data-split="tiles"]')).toBeNull();
    expect(template!.querySelectorAll('table').length).toBeGreaterThan(0);
  });

  it('and wait for their data in the template\'s own loading arrangement', () => {
    for (const file of ['app/(dashboard)/requests/loading.tsx', 'app/(dashboard)/requests/page.tsx', 'app/(dashboard)/keys/loading.tsx', 'app/(dashboard)/members/loading.tsx']) {
      expect(source(file), file).toMatch(/import \{[^}]*\bRecordsSkeleton\b[^}]*\} from '@\/components\/templates\/records'/);
      expect(source(file), file).toMatch(/<RecordsSkeleton\b/);
    }
  });

  it('none of them arranges its own tiles and table any more', () => {
    for (const file of ['src/views/requests.tsx', 'src/views/keys.tsx', 'src/views/members.tsx']) {
      expect(source(file), file).toMatch(/from '@\/components\/templates\/records'/);
      expect(source(file), file).not.toMatch(/split="tiles"/);
    }
  });
});
