import { connection } from 'next/server';
import { AppShell } from '@/components/base/shell';
import { ConsolePalette, ConsoleRail } from '@/views/console-chrome';
import { ShellTools } from '@/components/patterns/shell-tools';
import { assistantConfig } from '@/lib/assistant/config';
import { DEMO_NOW } from '@/system/fixtures/sample';
import { ALERTS } from '@/system/fixtures/sample-ops';

/** Every console page: the rail on the frame, the page on the canvas. Put your sign-in gate here. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The assistant is on or off per request, from the environment at request time, never baked into the build.
  await connection();
  const assistant = assistantConfig(process.env) !== null;
  return (
    <AppShell rail={<ConsoleRail />} tools={<ShellTools alerts={ALERTS} now={DEMO_NOW} />} assistant={assistant}>
      {children}
      <ConsolePalette />
    </AppShell>
  );
}
