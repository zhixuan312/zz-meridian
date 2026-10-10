import { connection } from 'next/server';
import { AppShell } from '@/components/base/shell';
import { ConsolePalette, ConsoleRail } from '@/views/console-chrome';
import { ShellTools } from '@/components/patterns/shell-tools';
import { assistantConfig } from '@/lib/assistant/config';
import { DEMO_NOW, ALERTS } from '@/data/sample';
import { chromeAccess, resolveAccess } from '@/data/access';
import { ConsoleLive } from '@/views/console-live';

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
  return (
    <AppShell rail={<ConsoleRail access={access} />} tools={<ShellTools alerts={ALERTS} now={DEMO_NOW} />} assistant={assistant}>
      <ConsoleLive scope={scope}>{children}</ConsoleLive>
      <ConsolePalette access={access} />
    </AppShell>
  );
}
