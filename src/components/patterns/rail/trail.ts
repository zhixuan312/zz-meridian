import type { NavGroup } from '@/app.config';
import type { Crumb } from '@/components/ui/breadcrumb';

/**
 * The crumbs from the top of the declared navigation to `href`: `[parent, item]` for a sub page, `[item]` for an item
 * with no parent, `[]` for an href no item declares. The last crumb has no `href`, so Breadcrumb draws it as the page.
 */
export function navTrail(href: string, groups: NavGroup[]): Crumb[] {
  const group = groups.find((g) => g.items.some((it) => it.href === href));
  const item = group?.items.find((it) => it.href === href);
  if (!group || !item) return [];
  // The rail's rule for a parent (`parentOf` in the rail): another item of the same group, which is not itself a sub page.
  const under = 'under' in item && typeof item.under === 'string' ? item.under : undefined;
  const parent = under === undefined ? undefined : group.items.find((p) => p.href === under && p !== item);
  const nested = parent !== undefined && 'under' in parent && typeof parent.under === 'string' && group.items.some((x) => x.href === parent.under && x !== parent);
  return parent && !nested ? [{ label: parent.label, href: parent.href }, { label: item.label }] : [{ label: item.label }];
}
