'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, MAX_AGE, samePassword, token } from '@/lib/demo-gate';

export type DemoSignInState = { error: boolean };

/** Checks the demo password: a match sets the session and opens the console, a miss comes back after 600 ms. */
export async function demoSignIn(_: DemoSignInState, form: FormData): Promise<DemoSignInState> {
  const given = String(form.get('password') ?? '').slice(0, 512);
  if (!samePassword(given)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: true };
  }
  const secure = (await headers()).get('x-forwarded-proto') === 'https';
  (await cookies()).set(COOKIE, token(), { httpOnly: true, path: '/', sameSite: 'lax', maxAge: MAX_AGE, secure });
  redirect('/');
}
