import { AppShell } from '@/components/base/shell';
import { Rail } from '@/components/patterns/rail';
import { CommandPalette } from '@/components/patterns/command-palette';
import { ShellTools } from '@/components/patterns/shell-tools';

/** Every console page: the rail on the frame, the page on the canvas. Put your sign-in gate here. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell rail={<Rail />} tools={<ShellTools />}>
      {children}
      <CommandPalette />
    </AppShell>
  );
}
