// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, revalidateTag: () => {} }));

import { REQUEST_PAGE, readRequests, requestsQuery } from '@/data/requests';

describe('the requests address', () => {
  it('becomes one validated query: filters as conditions, the page as offset, the newest first by default', () => {
    const { query, state } = requestsQuery({ status: '5xx', method: 'POST', page: '3' });
    expect(query.limit).toBe(REQUEST_PAGE);
    expect(query.offset).toBe(2 * REQUEST_PAGE);
    expect(query.sort).toEqual({ field: 'at', dir: 'desc' });
    expect(query.where).toEqual(expect.arrayContaining([{ field: 'statusClass', op: 'eq', value: '5xx' }, { field: 'method', op: 'eq', value: 'POST' }]));
    expect(state).toMatchObject({ status: '5xx', method: 'POST', page: 3, sort: 'at', dir: 'desc' });
  });
  it('drops what it cannot use instead of passing it on', () => {
    const { query, state } = requestsQuery({ status: 'teapot', sort: 'password', dir: 'sideways', page: '-4', region: 'Mars' });
    expect(state).toMatchObject({ status: 'all', sort: 'at', dir: 'desc', page: 1, region: 'all' });
    expect(query.offset).toBe(0);
    expect(JSON.stringify(query)).not.toMatch(/teapot|password|sideways|Mars/);
  });
});

describe('readRequests', () => {
  it('sends one page of rows with the total and the summary of the whole filtered set', async () => {
    const all = await readRequests({});
    expect(all.rows).toHaveLength(REQUEST_PAGE);
    expect(all.total).toBeGreaterThan(REQUEST_PAGE);
    const errors = await readRequests({ status: '5xx' });
    expect(errors.total).toBeLessThan(all.total);
    expect(errors.rows.every((r) => Number(r.status) >= 500)).toBe(true);
    expect(all.summary.count).toBe(all.total);
    expect(errors.summary.count).toBe(errors.total);
    expect(all.summary.partial).toBe(false);
    const last = await readRequests({ page: String(Math.ceil(all.total / REQUEST_PAGE)) });
    expect(last.rows.length).toBe(all.total - (Math.ceil(all.total / REQUEST_PAGE) - 1) * REQUEST_PAGE);
  });
});
