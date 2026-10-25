import { connection } from 'next/server';
import { PasswordPanel, PersonaPanel, type Persona } from './panel';
import { gated } from '@/lib/demo-gate';
import { PERSONAS } from '@/data/access';
import { members } from '@/data/collections';
import { roleLabel } from '@/data/roles';

/** The five personas in their own order, with the name and role the panel shows and whether they may be chosen. */
async function personaList(): Promise<Persona[]> {
  const { rows } = await members.query({ where: [{ field: 'id', op: 'in', value: [...PERSONAS] }] }); // allow-no-direct-query: read() cannot serve this — the panel lists personas before an AccessScope exists
  const byId = new Map(rows.map((member) => [member.id, member]));
  return PERSONAS.flatMap((id) => {
    const member = byId.get(id);
    return member ? [{ id, name: member.name, role: roleLabel(member), disabled: member.status !== 'Active' }] : [];
  });
}

/**
 * The password panel when `DEMO_PASSWORD` is set at run time, otherwise the people the console can be opened as; the page
 * around it prerenders. The sample has no other way in: no link is emailed and no identity provider is asked, so the
 * page offers neither.
 */
export async function GatedPanel() {
  await connection();
  const personas = await personaList();
  return gated() ? <PasswordPanel personas={personas} /> : <PersonaPanel personas={personas} />;
}
