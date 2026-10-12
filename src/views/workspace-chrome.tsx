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
import { Suspense } from 'react';
import { workspaces, type WorkspaceId } from '@/app.config';
import { ConsolePalette, ConsoleRail } from '@/views/console-chrome';
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
  const router = useRouter();
  // Choosing the workspace already in view does nothing, so the page and its filters stay.
  const scopes = WORKSPACE_IDS.map((id) => ({
    id,
    label: workspaces[id].label,
    active: id === current,
    onSelect: () => {
      if (id !== current) router.push(workspaces[id].homeHref);
    },
  }));
  return <ConsoleRail access={access} nav={navOf(current)} workspace={workspaces[current].label} scopes={scopes} />;
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
