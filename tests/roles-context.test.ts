// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ADD_ONS, GRANTS, MAIN_ROLES, roleLabel, whoCan } from '@/data/roles';
import { membersContext } from '@/logic/members-context';
import { hasSample } from './sample-present';

// Every case reads the sample roster's own people; a product that replaced the sample has none, so they are not
// applicable there (#131).
type Sample = typeof import('@/system/fixtures/sample-members');
const sample = hasSample()
  ? (await import(/* @vite-ignore */ new URL('../src/system/fixtures/sample-members.ts', import.meta.url).pathname)) as Sample
  : null;

const describeSample = describe.skipIf(!sample);
const ctx = () => membersContext(sample!.MEMBERS, '2026-10-04T00:00:00.000Z');
const fact = (label: string) => ctx().facts.find((f) => f.label === label)!;
// Lazy: computed inside the case that reads it, never at module load, where the sample may be absent (#131).
const all = () => JSON.stringify(ctx());

it('labels a member by their role and add-ons', () => {
  expect(roleLabel({ role: 'Member', addOns: [] })).toBe('Member');
  expect(roleLabel({ role: 'Member', addOns: ['Key manager'] })).toBe('Member + Key manager');
});

describeSample('the sample roster', () => {
it('describes every role from the table, not from a sentence', () => {
  const definition = fact('Roles').definition ?? '';
  for (const role of [...MAIN_ROLES, ...ADD_ONS]) expect(definition).toContain(role);
  for (const role of MAIN_ROLES) {
    const line = definition.split('; ').find((l) => l.startsWith(`${role}: `));
    expect(line, `no line for ${role}`).toBeTruthy();
    expect(line!.includes('the workspace')).toBe(GRANTS[role].includes('workspace:update'));
  }
});

it('counts who can change the workspace from the grant that decides it', () => {
  const may = whoCan('workspace:update');
  const active = sample!.MEMBERS.filter((m) => m.status === 'Active');
  const allowed = active.filter((m) => may.includes(m.role));
  const insight = ctx().insights.find((i) => i.text.includes('can change the workspace'))!;
  expect(insight.text).toContain(`${allowed.length} of ${active.length} active members`);
  expect(insight.text).toContain(`(${may.join(' or ')})`);
});

it('shows a member with an add-on by their full role', () => {
  expect(all()).toContain('Lucas Meyer (Member + Key manager');
});
});
