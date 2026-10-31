// @vitest-environment node
import { expect, it } from 'vitest';
import { members } from '@/data/collections';

const base = { name: 'Test Person', email: 'test.person@example.com', team: 'Support', status: 'Invited', joined: '2026-10-01', lastActive: null };

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
