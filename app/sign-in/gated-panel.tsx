import { connection } from 'next/server';
import { PasswordPanel, SignInPanel } from './panel';
import { gated } from '@/lib/demo-gate';

/** The demo's password when `DEMO_PASSWORD` is set at run time, the product's sign-in otherwise; the page around it prerenders. */
export async function GatedPanel() {
  await connection();
  return gated() ? <PasswordPanel /> : <SignInPanel />;
}
