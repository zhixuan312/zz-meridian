// @vitest-environment node
import { expect, it } from 'vitest';
import { members } from '@/data/collections';
import { MEMBERS } from '@/system/fixtures/sample-members';

const base = { name: 'Test Person', email: 'test.person@example.com', team: 'Support', status: 'Invited', joined: '2026-10-01', lastActive: null };

it('carries the frozen assignments', () => {
  const by = Object.fromEntries(MEMBERS.map((m) => [m.id, m]));
  expect([by.members_1.role, by.members_1.addOns]).toEqual(['Owner', []]);
  expect([by.members_2.role, by.members_2.addOns]).toEqual(['Admin', []]);
  expect([by.members_4.role, by.members_4.addOns]).toEqual(['Member', []]);
  expect([by.members_5.role, by.members_5.addOns]).toEqual(['Member', ['Key manager']]);
  expect([by.members_12.role, by.members_12.addOns]).toEqual(['Viewer', []]);
  expect(MEMBERS.filter((m) => m.addOns.length).map((m) => m.id)).toEqual(['members_5']);
});

it('refuses an unknown role or add-on and stores a repeated add-on once', async () => {
  await expect(members.create!({ ...base, role: 'Superuser', addOns: [] })).rejects.toThrow();
  await expect(members.create!({ ...base, role: 'Member', addOns: ['Billing'] })).rejects.toThrow();
  const made = await members.create!({ ...base, role: 'Member', addOns: ['Key manager', 'Key manager'] });
  try {
    expect(made.addOns).toEqual(['Key manager']);
  } finally {
    await members.remove!([made.id]);
  }
});

it('never resets role or add-ons on an update that does not name them', async () => {
  const made = await members.create!({ ...base, role: 'Admin', addOns: ['Key manager'] });
  try {
    const [after] = await members.update!([made.id], { team: 'Sales' });
    expect([after.role, after.addOns, after.team]).toEqual(['Admin', ['Key manager'], 'Sales']);
  } finally {
    await members.remove!([made.id]);
  }
});
