import { connection } from 'next/server';
import { AppShell } from '@/components/base/shell';
import { AssistantScope } from '@/components/patterns/assistant/scope';
import { WorkspacePalette, WorkspaceRail } from '@/views/workspace-chrome';
import { assistantConfig } from '@/lib/assistant/config';
import { readAlerts } from '@/logic/alerts';
import { chromeAccess, resolveAccess } from '@/data/access';
import { ConsoleLive } from '@/views/console-live';
import { ShellAlerts } from '@/views/shell-alerts';

/** Every console page: the rail on the frame, the page on the canvas. Put your sign-in gate here. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The assistant is on or off per request, from the environment at request time, never baked into the build. The layout
  // hands the shell a promise instead of awaiting it, so the request never blocks the frame: the shell streams in the
  // static chrome and the launcher resolves behind its own boundary.
  const assistant = connection().then(() => assistantConfig(process.env) !== null);
  // The scope key reaches the live provider the same way, as a promise it resolves behind its own boundary.
  const scope = resolveAccess().then((s) => `${s.tenantId}/${s.subjectId}`);
  // The rail's destinations, the signed-in person and the View as group, one promise for both pieces of chrome: not
  // awaited, so the frame is still the first thing streamed. An identity nobody can resolve settles on null, which the
  // chrome draws as the placeholder person and no destination — never the sample person.
  const access = chromeAccess().catch(() => null);
  // The bell's alerts are read the same way: the shell draws the tools with no alert and fills them in when the read
  // settles. A person who may not be told anything, or a read that fails, settles on null and the tools stay quiet.
  const alerts = readAlerts().catch(() => null);
  // The assistant keeps its thread for the same key, so a change of person or tenant starts an empty one; a scope nobody
  // can resolve keeps the thread of no one.
  return (
    <AssistantScope scope={scope.catch(() => '')}>
      <AppShell rail={<WorkspaceRail access={access} />} tools={<ShellAlerts alerts={alerts} />} assistant={assistant}>
        <ConsoleLive scope={scope}>{children}</ConsoleLive>
        <WorkspacePalette access={access} />
      </AppShell>
    </AssistantScope>
  );
}
