import { nav, workspaces, type NavGroup, type WorkspaceId } from '@/app.config';
import { entryFor } from '@/components/patterns/rail/trail';

/** The workspaces in the order the product declares them. */
export const WORKSPACE_IDS = Object.keys(workspaces) as WorkspaceId[];

const owned = nav.flatMap((g) => g.items).filter((i) => i.workspace !== undefined);

/**
 * The workspace an address belongs to: the owner of the longest entry it falls under (`entryFor`). An address no entry
 * owns belongs to no workspace. The address is all there is to read: nothing here remembers a choice.
 */
export function workspaceOf(pathname: string): WorkspaceId | null {
  return entryFor(pathname, owned)?.workspace ?? null;
}

/** One workspace's navigation: the declared groups holding only its entries, in their order, an emptied group dropped. */
export function navOf(id: WorkspaceId): NavGroup[] {
  return nav.map((g) => ({ ...g, items: g.items.filter((i) => i.workspace === id) })).filter((g) => g.items.length > 0);
}
