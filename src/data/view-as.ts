'use server';

import { cookies, headers } from 'next/headers';
import { refresh } from 'next/cache';
import { memberById, PERSONAS } from '@/data/access';
import { MAX_AGE, VIEW_AS_COOKIE } from '@/lib/demo-gate';

/** What `chooseViewAs` tells the person when the id it was handed cannot be chosen. */
const REFUSED = "That person can't be chosen right now.";

/**
 * Signs the demo in as the chosen persona. The id must be one of the frozen personas and its record must be Active;
 * anything else throws the one readable message and sets nothing. The cookie is the demo's only session, so `refresh`
 * re-reads the routes with the new person.
 */
export async function chooseViewAs(id: string): Promise<void> {
  if (!(PERSONAS as readonly string[]).includes(id)) throw new Error(REFUSED);
  const member = await memberById(id);
  if (!member || member.status !== 'Active') throw new Error(REFUSED);
  const secure = (await headers()).get('x-forwarded-proto') === 'https';
  (await cookies()).set(VIEW_AS_COOKIE, id, { httpOnly: true, path: '/', sameSite: 'lax', maxAge: MAX_AGE, secure });
  refresh();
}
