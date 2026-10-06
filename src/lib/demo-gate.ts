/**
 * A password in front of the whole product, for a demo deployment: an HttpOnly cookie holding an expiry and its HMAC.
 * It is closed only when `DEMO_PASSWORD` is set; without it (local development, and every product that never sets it)
 * nothing is gated. The key is derived from `DEMO_SECRET` (or, without it, from `DEMO_PASSWORD`), so a session survives
 * restarts and redeploys, and changing either signs everyone out. A session lasts 30 days and is renewed when a visit
 * finds it past half its life. Server only.
 */
import crypto from 'node:crypto';

export const COOKIE = 'zz_meridian_demo';
export const MAX_AGE = 30 * 24 * 3600;

const password = () => process.env.DEMO_PASSWORD ?? '';
/** Whether the gate is closed: only when a password is configured. */
export const gated = () => password() !== '';
const key = () => crypto.createHmac('sha256', process.env.DEMO_SECRET || password()).update('zz-meridian-demo-session-v1').digest();
const sign = (expires: number | string) => crypto.createHmac('sha256', key()).update(String(expires)).digest('hex');

/** A fresh session value: expiry.signature. */
export function token(): string {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${expires}.${sign(expires)}`;
}

/** The session's expiry in seconds when the cookie value is genuine and unexpired, else 0. */
export function expiresOf(value: string | undefined): number {
  const m = value?.match(/^([0-9]+)\.([0-9a-f]{64})$/);
  if (!m || Number(m[1]) < Date.now() / 1000) return 0;
  const a = Buffer.from(m[2]!, 'hex');
  const b = Buffer.from(sign(m[1]!), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? Number(m[1]) : 0;
}

/** Compares with the configured password in constant time, whatever the lengths. */
export function samePassword(given: string): boolean {
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(password()).digest();
  return gated() && crypto.timingSafeEqual(a, b);
}
