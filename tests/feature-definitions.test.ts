// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ACTIONS, FEATURES } from '@/data/features';
import { GRANTS } from '@/data/roles';
import { collections } from '@/data/collections';

const byName = Object.fromEntries(collections.map((c) => [c.name, c]));
const grantsOf = (need: unknown): string[] => (typeof need === 'string' ? (need === 'public' ? [] : [need]) : (need as { allOf: string[] }).allOf);
// What a collection supports is the operation it actually carries: `arrayCollection` attaches `create`, `update` and
// `remove` only for the operations it allows, so their presence is the capability an adopter's collection declares.
const unsupported = (g: string) => {
  const [name, op] = g.split(':');
  const c = byName[name];
  if (!c) return `no collection ${name}`;
  if (op === 'read') return null;
  if (op === 'create') return c.create ? null : `${name} does not support create`;
  if (op === 'update') return c.update ? null : `${name} does not support update`;
  if (op === 'remove') return c.remove ? null : `${name} does not support remove`;
  return `${op} is not an operation`;
};

describe('every grant names a collection and an operation it supports', () => {
  it('holds for the role table', () => {
    const bad: string[] = [];
    for (const [role, grants] of Object.entries(GRANTS)) for (const g of grants) { const why = unsupported(g); if (why) bad.push(`${role} -> ${g}: ${why}`); }
    expect(bad).toEqual([]);
  });

  it('holds for every need a feature or an action declares', () => {
    const bad: string[] = [];
    for (const [id, f] of Object.entries(FEATURES)) for (const g of grantsOf(f.needs)) { const why = unsupported(g); if (why) bad.push(`feature ${id} -> ${g}: ${why}`); }
    for (const [id, a] of Object.entries(ACTIONS)) for (const g of grantsOf(a.needs)) { const why = unsupported(g); if (why) bad.push(`action ${id} -> ${g}: ${why}`); }
    expect(bad).toEqual([]);
  });
});
