// @vitest-environment node
import { expect, it } from 'vitest';
import { ADD_ONS, GRANTS, MAIN_ROLES, roleLabel, whoCan } from '@/data/roles';
import { membersContext } from '@/views/members-context';
import { MEMBERS } from '@/system/fixtures/sample-members';

const ctx = membersContext(MEMBERS, '2026-10-04T00:00:00.000Z');
const fact = (label: string) => ctx.facts.find((f) => f.label === label)!;
const all = JSON.stringify(ctx);

it('labels a member by their role and add-ons', () => {
  expect(roleLabel({ role: 'Member', addOns: [] })).toBe('Member');
  expect(roleLabel({ role: 'Member', addOns: ['Key manager'] })).toBe('Member + Key manager');
});

it('describes every role from the table, not from a sentence', () => {
  const definition = fact('Roles').definition ?? '';
  for (const role of [...MAIN_ROLES, ...ADD_ONS]) expect(definition).toContain(role);
  expect(definition).not.toContain('Owner and Admin manage members and keys');
  for (const role of MAIN_ROLES) {
    const line = definition.split('; ').find((l) => l.startsWith(`${role}: `));
    expect(line, `no line for ${role}`).toBeTruthy();
    expect(line!.includes('the workspace')).toBe(GRANTS[role].includes('workspace:update'));
  }
});

it('counts who can change the workspace from the grants', () => {
  const may = whoCan('members:update');
  const active = MEMBERS.filter((m) => m.status === 'Active');
  const allowed = active.filter((m) => may.includes(m.role));
  const insight = ctx.insights.find((i) => i.text.includes('can change the workspace'))!;
  expect(insight.text).toContain(`${allowed.length} of ${active.length} active members`);
  expect(insight.text).toContain(`(${may.join(' or ')})`);
});

it('shows a member with an add-on by their full role', () => {
  expect(all).toContain('Lucas Meyer (Member + Key manager');
});
