'use client';

/**
 * The product's rail and palette: the managed console chrome, given the navigation of the workspace the address is in.
 *
 * The address is the only thing that says which workspace is in view. Nothing here is kept — no cookie, no storage, no
 * query parameter, no state — so a detail page, a pasted link, a refresh and Back all land in the workspace that owns the
 * page, and a failed navigation leaves the rail on the workspace of the address the browser is still at. An address no
 * entry owns (the not-found page) gets Main's navigation.
 *
 * Reading the address makes a component wait for the request on a route with a parameter, so each reads it behind a
 * boundary of its own and the shell keeps its prerendered frame wherever the parent gives it none.
 */
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, use } from 'react';
import { workspaces, type WorkspaceId } from '@/app.config';
import { useLeave } from '@/components/base/shell';
import { ConsolePalette, ConsoleRail, RailPending, visible } from '@/views/console-chrome';
import { WORKSPACE_IDS, navOf, workspaceOf } from '@/views/workspaces';
import type { ChromeAccess } from '@/lib/collection';

/** The workspace the address is in; Main for an address no entry owns. */
function useWorkspace(): WorkspaceId {
  return workspaceOf(usePathname()) ?? 'main';
}

export function WorkspaceRail({ access }: { access: Promise<ChromeAccess | null> }) {
  return (
    <Suspense fallback={null}>
      <RailInView access={access} />
    </Suspense>
  );
}

function RailInView({ access }: { access: Promise<ChromeAccess | null> }) {
  const current = useWorkspace();
  return (
    <Suspense fallback={<RailPending />}>
      <RailFor access={access} current={current} />
    </Suspense>
  );
}

/**
 * The rail once the person is known, because the menu offers only where they may go: a workspace is listed when they may
 * open at least one of its destinations, and its row opens the workspace's home, or the first destination they may open
 * when the home is not one. A workspace still decides nothing about access; this only keeps the menu from offering what
 * the page would refuse. With one workspace left there is nothing to switch between, and the rail says so itself.
 */
function RailFor({ access, current }: { access: Promise<ChromeAccess | null>; current: WorkspaceId }) {
  const chrome = use(access);
  const router = useRouter();
  const leave = useLeave();
  const open = (id: WorkspaceId) => (chrome ? visible(chrome.only, navOf(id)).flatMap((g) => g.items.map((i) => i.href)) : []);
  const target = (id: WorkspaceId) => (open(id).includes(workspaces[id].homeHref) ? workspaces[id].homeHref : open(id)[0]!);
  const scopes = WORKSPACE_IDS.filter((id) => open(id).length > 0).map((id) => ({
    id,
    label: workspaces[id].label,
    active: id === current,
    href: target(id),
    // Choosing the workspace already in view does nothing, so the page and its filters stay.
    onSelect: () => {
      if (id === current) return;
      leave(() => router.push(target(id)));
    },
  }));
  return <ConsoleRail access={chrome} nav={navOf(current)} workspace={workspaces[current].label} scopes={scopes} />;
}

export function WorkspacePalette({ access }: { access: Promise<ChromeAccess | null> }) {
  return (
    <Suspense fallback={null}>
      <PaletteInView access={access} />
    </Suspense>
  );
}

function PaletteInView({ access }: { access: Promise<ChromeAccess | null> }) {
  return <ConsolePalette access={access} nav={navOf(useWorkspace())} />;
}
