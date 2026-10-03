import { AppShell } from '@/components/base/shell';
import { Rail } from '@/components/patterns/rail';
import { CommandPalette } from '@/components/patterns/command-palette';
import { ShellTools } from '@/components/patterns/shell-tools';
import { DEMO_NOW } from '@/system/fixtures/sample';
import { ALERTS } from '@/system/fixtures/sample-ops';

/** Every console page: the rail on the frame, the page on the canvas. Put your sign-in gate here. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell rail={<Rail />} tools={<ShellTools alerts={ALERTS} now={DEMO_NOW} />}>
      {children}
      <CommandPalette />
    </AppShell>
  );
}
