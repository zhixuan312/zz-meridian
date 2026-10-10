'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, MAX_AGE, samePassword, token } from '@/lib/demo-gate';
import { PERSONAS, VIEW_AS_COOKIE } from '@/data/access';
import { members } from '@/data/collections';
import { chooseViewAs } from '@/data/view-as';

export type DemoSignInState = { error: boolean };
export type SignInAsState = { error?: string };

/** The member a persona id names, or null: the id must be one of the five, and their record Active. */
async function personaOf(id: string) {
  if (!(PERSONAS as readonly string[]).includes(id)) return null;
  const member = (await members.query({ where: [{ field: 'id', op: 'eq', value: id }] })).rows[0];
  return member?.status === 'Active' ? member : null;
}

/**
 * The gated demo: checks the password, then the person to open as, then sets the session and opens the console.
 * A wrong password comes back after 600 ms; a wrong person also sets nothing, so the choice never bypasses the password.
 */
export async function demoSignIn(_: DemoSignInState, form: FormData): Promise<DemoSignInState> {
  const given = String(form.get('password') ?? '').slice(0, 512);
  if (!samePassword(given)) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: true };
  }
  const id = String(form.get('persona') ?? PERSONAS[0]);
  if (!(await personaOf(id))) return { error: true };
  const secure = (await headers()).get('x-forwarded-proto') === 'https';
  const jar = await cookies();
  jar.set(COOKIE, token(), { httpOnly: true, path: '/', sameSite: 'lax', maxAge: MAX_AGE, secure });
  jar.set(VIEW_AS_COOKIE, id, { httpOnly: true, path: '/', sameSite: 'lax', secure });
  redirect('/');
}

/** The open demo, without a password: the list's choice signs the request in as that person and opens the console. */
export async function signInAs(_: SignInAsState, form: FormData): Promise<SignInAsState> {
  try {
    await chooseViewAs(String(form.get('persona') ?? ''));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "That person can't be chosen right now." };
  }
  redirect('/');
}
