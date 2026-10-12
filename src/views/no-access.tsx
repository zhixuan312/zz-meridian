import Link from 'next/link';
import { nav, workspaces } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { chromeAccess } from '@/data/access';
import { ACTIONS, FEATURES, type ActionId, type FeatureId } from '@/data/features';
import { whoCan } from '@/data/roles';
import type { Need } from '@/lib/collection';
import { navOf } from '@/views/workspaces';

/** Names as a reader meets them, in table order: "Owners", "Owners, Admins", "Owners, Admins and Members". */
function list(roles: readonly string[]): string {
  const names = roles.map((role) => `${role}s`);
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** The same names offered as a choice, with the article the first one takes: "an Owner or Admin". */
function or(roles: readonly string[]): string {
  const [first] = roles;
  if (!first) return '';
  return `${/^[aeiou]/i.test(first) ? 'an' : 'a'} ${roles.join(' or ')}`;
}

/**
 * What a person who may not open a page is told: the title they followed, who can open it, and who to ask. The roles
 * are read off the table (`whoCan`), never written per feature, so editing `GRANTS` edits every sentence. When
 * `whoCan` is empty no single role's own grants satisfy the need — it takes a main role together with an add-on — and
 * the sentence says that rather than naming a role that would not suffice alone. A need of `public` never reaches here.
 */
export function noAccessCopy(need: Need, title: string): { title: string; description: string } {
  const roles = need === 'public' ? [] : whoCan(need);
  const ask = `Ask ${or(whoCan('members:update'))} for access.`;
  return {
    title: `You don't have access to ${title}`,
    description: roles.length === 0 ? `Access needs a main role together with an add-on. ${ask}` : `${list(roles)} can open it. ${ask}`,
  };
}

/**
 * What a page shows when it withholds an action: the one sentence saying who can run it, frozen on the action's own
 * entry in the table, so the control and its explanation never drift. A page asks for it by the action's id and renders
 * it once; `NoAccess` covers the whole feature, this covers one control on a page the person may otherwise open.
 */
export function actionLine(id: ActionId): string {
  return ACTIONS[id].line ?? '';
}

/**
 * The one way out of a refused page: the first destination of the page's own workspace that this person may open, or
 * Main's home when there is none (or when who they are cannot be told). The page's workspace is the one whose entry
 * carries the feature's own need; a feature no entry names belongs to Main.
 */
async function wayOut(feature: FeatureId): Promise<{ href: string; label: string }> {
  const owner = nav.flatMap((g) => g.items).find((i) => i.needs === FEATURES[feature].needs)?.workspace ?? 'main';
  const only = await chromeAccess().then((a) => a.only, () => null);
  const first = only ? navOf(owner).flatMap((g) => g.items).find((i) => only.includes(i.href)) : undefined;
  return first ? { href: first.href, label: first.label } : { href: workspaces.main.homeHref, label: workspaces.main.label };
}

/**
 * What a page returns a person who may not open it: the feature's own title, who can, and one link out. A page asks
 * authorization first and returns this before any protected read — so the answer is a normal 200 that holds none of the
 * records, never a disguised 404 — and it is async, so a page awaits it and no caller depends on a synchronous result.
 */
export async function NoAccess({ feature }: { feature: FeatureId }) {
  const { title, description } = noAccessCopy(FEATURES[feature].needs, FEATURES[feature].title);
  const out = await wayOut(feature);
  return (
    <PageFrame title={FEATURES[feature].title}>
      <EmptyState
        kind="no-access"
        title={title}
        action={<Button asChild variant="secondary"><Link href={out.href}>Go to {out.label}</Link></Button>}
      >
        {description}
      </EmptyState>
    </PageFrame>
  );
}
