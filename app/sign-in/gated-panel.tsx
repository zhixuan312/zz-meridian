import { connection } from 'next/server';
import { PasswordPanel, PersonaPanel, SignInPanel, type Persona } from './panel';
import { gated } from '@/lib/demo-gate';
import { PERSONAS } from '@/data/access';
import { members } from '@/data/collections';
import { roleLabel } from '@/data/roles';

/** The five personas in their own order, with the name and role the panel shows and whether they may be chosen. */
async function personaList(): Promise<Persona[]> {
  const { rows } = await members.query({ where: [{ field: 'id', op: 'in', value: [...PERSONAS] }] });
  const byId = new Map(rows.map((member) => [member.id, member]));
  return PERSONAS.flatMap((id) => {
    const member = byId.get(id);
    return member ? [{ id, name: member.name, role: roleLabel(member), disabled: member.status !== 'Active' }] : [];
  });
}

/**
 * The demo's password when `DEMO_PASSWORD` is set at run time, otherwise the personas it can be opened as beside the
 * product's sign-in; the page around it prerenders.
 */
export async function GatedPanel() {
  await connection();
  const personas = await personaList();
  if (gated()) return <PasswordPanel personas={personas} />;
  return (
    <div className="flex flex-col gap-6">
      <PersonaPanel personas={personas} />
      <SignInPanel />
    </div>
  );
}
