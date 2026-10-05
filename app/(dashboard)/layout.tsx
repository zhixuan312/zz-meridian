import { connection } from 'next/server';
import { AppShell } from '@/components/base/shell';
import { ConsolePalette, ConsoleRail } from '@/views/console-chrome';
import { ShellTools } from '@/components/patterns/shell-tools';
import { assistantConfig } from '@/lib/assistant/config';
import { DEMO_NOW, ALERTS } from '@/data/sample';
import { resolveAccess } from '@/data/access';
import { ConsoleLive } from '@/views/console-live';

/** Every console page: the rail on the frame, the page on the canvas. Put your sign-in gate here. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The assistant is on or off per request, from the environment at request time, never baked into the build. The layout
  // hands the shell a promise instead of awaiting it, so the request never blocks the frame: the shell streams in the
  // static chrome and the launcher resolves behind its own boundary.
  const assistant = connection().then(() => assistantConfig(process.env) !== null);
  // The scope key reaches the live provider the same way, as a promise it resolves behind its own boundary.
  const scope = resolveAccess().then((s) => `${s.tenantId}/${s.subjectId}`);
  return (
    <AppShell rail={<ConsoleRail />} tools={<ShellTools alerts={ALERTS} now={DEMO_NOW} />} assistant={assistant}>
      <ConsoleLive scope={scope}>{children}</ConsoleLive>
      <ConsolePalette />
    </AppShell>
  );
}
