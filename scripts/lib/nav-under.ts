/**
 * The gate's rule for a sub page: a nav item that names its parent with `under`. The rail draws one list nested under
 * the parent, so a navigation it cannot draw is refused here. Pure, and imports nothing from the project, so a test can
 * feed it navigations of its own.
 */
type Item = { href: string; workspace?: string; under?: string };
type Group = { label?: string; items: Item[] };

const MAX_SUB_PAGES = 7;

/** The `under` an item names, or undefined: a project whose `NavItem` has no such field passes. */
const underOf = (it: Item): string | undefined => ('under' in it && typeof it.under === 'string' ? it.under : undefined);

/** One line per refused item in item order, then per group the parents with too many sub pages. */
export function navUnderProblems(groups: Group[]): string[] {
  const out: string[] = [];
  const at = (href: string) => `src/app.config.ts: nav item ${href}`;
  for (const g of groups) {
    const byHref = new Map(g.items.map((it) => [it.href, it]));
    for (const it of g.items) {
      const under = underOf(it);
      if (under === undefined) continue;
      const parent = byHref.get(under);
      if (under === it.href) out.push(`${at(it.href)} is under itself`);
      else if (!parent) out.push(`${at(it.href)} is under ${under}, which is no item of its group`);
      else if (underOf(parent) !== undefined) out.push(`${at(it.href)} is under ${under}, which is itself under ${underOf(parent)}; the rail has three levels, never four`);
      else if (it.workspace !== parent.workspace) out.push(`${at(it.href)} is in workspace ${it.workspace ?? 'none'} under ${under}, which is in workspace ${parent.workspace ?? 'none'}`);
    }
    for (const it of g.items) {
      const n = g.items.filter((s) => underOf(s) === it.href).length;
      if (n > MAX_SUB_PAGES) out.push(`${at(it.href)} has ${n} sub pages; at most ${MAX_SUB_PAGES}, past that the item is a group of its own`);
    }
  }
  return out;
}
