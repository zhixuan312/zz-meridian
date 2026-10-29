import Link from 'next/link';
import { nav, workspaces } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { FEATURES, type FeatureId } from '@/data/features';
import { whoCan } from '@/data/roles';
import type { ChromeAccess, Need } from '@/lib/collection';
import { inWords } from '@/lib/format';
import { navOf } from '@/views/workspaces';

/** Names as a reader meets them, in table order: "Owners", "Owners, Admins", "Owners, Admins and Members". */
function list(roles: readonly string[]): string {
  return inWords(roles.map((role) => `${role}s`));
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
  // A role table where nobody may change members still names someone to ask.
  const ask = `Ask ${or(whoCan('members:update')) || 'an administrator'} for access.`;
  return {
    title: `You don't have access to ${title}`,
    description: roles.length === 0 ? `Access needs a main role together with an add-on. ${ask}` : `${list(roles)} can open it. ${ask}`,
  };
}

/**
 * The one way out of a refused page: the first destination of the page's own workspace that this person may open, or
 * Main's home when there is none (or when who they are cannot be told). The page's workspace is the one whose entry
 * carries the feature's own need; a feature no entry names belongs to Main.
 *
 * `only` empty is the one case with no way out: this person may open nothing at all, so every destination — Main's home
 * included — refuses them in turn, and a link to one is a loop rather than a way out. Who to ask is what the sentence
 * already says, and that is the whole answer.
 */
function wayOut(feature: FeatureId, only: readonly string[] | null): { href: string; label: string } | null {
  if (only && only.length === 0) return null;
  const owner = nav.flatMap((g) => g.items).find((i) => i.needs === FEATURES[feature].needs)?.workspace ?? 'main';
  const first = only ? navOf(owner).flatMap((g) => g.items).find((i) => only.includes(i.href)) : undefined;
  return first ? { href: first.href, label: first.label } : { href: workspaces.main.homeHref, label: workspaces.main.label };
}

/**
 * What a page returns a person who may not open it: the feature's own title, who can, and one link out. A page asks
 * authorization first and returns this before any protected read — so the answer is a normal 200 that holds none of the
 * records, never a disguised 404.
 *
 * `access` is the chrome `gate` resolved for the refusal, and the way out is chosen from it: the view asks no policy of
 * its own and is handed the answer. A descriptor whose session could not be read carries null, and the way out is Main's
 * home.
 */
export function NoAccess({ feature, access }: { feature: FeatureId; access: ChromeAccess | null }) {
  const { title, description } = noAccessCopy(FEATURES[feature].needs, FEATURES[feature].title);
  const only = access?.only ?? null;
  const out = wayOut(feature, only);
  return (
    <PageFrame title={FEATURES[feature].title}>
      <EmptyState
        kind="no-access"
        title={title}
        action={out ? <Button asChild variant="secondary"><Link href={out.href}>Go to {out.label}</Link></Button> : undefined}
      >
        {description}
      </EmptyState>
    </PageFrame>
  );
}
