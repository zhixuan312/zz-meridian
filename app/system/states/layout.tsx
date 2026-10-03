import { AppShell } from '@/components/base/shell';
import { Rail } from '@/components/patterns/rail';
import { ShellTools } from '@/components/patterns/shell-tools';
import { CommandPalette } from '@/components/patterns/command-palette';
import { DEMO_NOW } from '@/system/fixtures/sample';
import { ALERTS } from '@/system/fixtures/sample-ops';

/**
 * The console's transient screens, held still: the real loading and error components inside the real shell, so they
 * can be looked at and audited like any page. They appear in the product only while data is slow or failing.
 */
export default function StatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell rail={<Rail />} tools={<ShellTools alerts={ALERTS} now={DEMO_NOW} />}>
      {children}
      <CommandPalette />
    </AppShell>
  );
}
