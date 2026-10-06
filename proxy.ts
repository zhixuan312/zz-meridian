import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, MAX_AGE, expiresOf, gated, token } from '@/lib/demo-gate';

/**
 * The demo's password gate (`src/lib/demo-gate.ts`), open unless `DEMO_PASSWORD` is set. Every route needs a live
 * session except the sign-in page and the files a browser fetches for it; an API answers 401 instead of redirecting.
 * Opening the sign-in page signs the demo out, which is what the rail's Sign out does. A visit past half the session's
 * life renews it.
 */
export function proxy(req: NextRequest) {
  if (!gated()) return NextResponse.next();
  const { pathname } = req.nextUrl;
  const value = req.cookies.get(COOKIE)?.value;
  if (pathname === '/sign-in') {
    const res = NextResponse.next();
    // A POST here is the sign-in itself, which sets the session; only a visit clears it.
    if (req.method === 'GET' && value) res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }
  const expires = expiresOf(value);
  if (!expires) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in to the demo first.' }, { status: 401 });
    const to = req.nextUrl.clone();
    to.pathname = '/sign-in';
    to.search = '';
    return NextResponse.redirect(to, 303);
  }
  const res = NextResponse.next();
  if (expires - Date.now() / 1000 < MAX_AGE / 2) {
    res.cookies.set(COOKIE, token(), { httpOnly: true, path: '/', sameSite: 'lax', maxAge: MAX_AGE, secure: req.headers.get('x-forwarded-proto') === 'https' });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|icon|apple-icon).*)'],
};
