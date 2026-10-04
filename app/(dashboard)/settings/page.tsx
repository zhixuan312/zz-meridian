import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { SettingsBody } from '@/views/settings';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Settings"
      description={`The workspace, what you hear about, how ${app.name} looks, and what assistants may do.`}
    >
      <SettingsBody />
    </PageFrame>
  );
}
