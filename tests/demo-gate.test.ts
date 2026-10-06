// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { COOKIE, MAX_AGE, expiresOf, gated, samePassword, token } from '@/lib/demo-gate';
import { proxy } from '../proxy';

const request = (path: string, { cookie, method = 'GET' }: { cookie?: string; method?: string } = {}) =>
  new NextRequest(`https://demo.example${path}`, { method, headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : {} });

afterEach(() => { delete process.env.DEMO_PASSWORD; delete process.env.DEMO_SECRET; });

describe('the demo gate, without DEMO_PASSWORD', () => {
  it('is open: every route passes and no password matches', () => {
    expect(gated()).toBe(false);
    expect(samePassword('')).toBe(false);
    expect(proxy(request('/')).headers.get('location')).toBeNull();
    expect(proxy(request('/api/export/requests')).status).toBe(200);
  });
});

describe('the demo gate, with DEMO_PASSWORD', () => {
  beforeEach(() => { process.env.DEMO_PASSWORD = 'open sesame'; });

  it('accepts the password and nothing else', () => {
    expect(samePassword('open sesame')).toBe(true);
    expect(samePassword('open sesam')).toBe(false);
    expect(samePassword('')).toBe(false);
  });
  it('signs a session it can read back, and refuses a forged, an expired or a re-keyed one', () => {
    const t = token();
    expect(expiresOf(t)).toBeGreaterThan(Date.now() / 1000 + MAX_AGE - 5);
    expect(expiresOf(`${Number(t.split('.')[0]) + 1}.${t.split('.')[1]}`)).toBe(0);
    expect(expiresOf(`1.${t.split('.')[1]}`)).toBe(0);
    expect(expiresOf(undefined)).toBe(0);
    process.env.DEMO_SECRET = 'rotated';
    expect(expiresOf(t)).toBe(0);
  });
  it('sends a visitor without a session to the sign-in page, and answers an API with 401', () => {
    const page = proxy(request('/system'));
    expect(page.status).toBe(303);
    expect(new URL(page.headers.get('location')!).pathname).toBe('/sign-in');
    expect(proxy(request('/api/assistant', { method: 'POST' })).status).toBe(401);
  });
  it('lets a session through, and renews one past half its life', () => {
    const fresh = proxy(request('/', { cookie: token() }));
    expect(fresh.headers.get('location')).toBeNull();
    expect(fresh.cookies.get(COOKIE)).toBeUndefined();
    vi.useFakeTimers();
    try {
      const t = token();
      vi.setSystemTime(Date.now() + 20 * 24 * 3600 * 1000);
      const renewed = proxy(request('/', { cookie: t })).cookies.get(COOKIE)?.value;
      expect(renewed).not.toBe(t);
      expect(expiresOf(renewed)).toBeGreaterThan(expiresOf(t));
    } finally {
      vi.useRealTimers();
    }
  });
  it('signs the demo out when the sign-in page is opened, and leaves the sign-in itself alone', () => {
    expect(proxy(request('/sign-in')).status).toBe(200);
    expect(proxy(request('/sign-in', { cookie: token() })).cookies.get(COOKIE)?.value).toBe('');
    expect(proxy(request('/sign-in', { cookie: token(), method: 'POST' })).cookies.get(COOKIE)).toBeUndefined();
  });
});
