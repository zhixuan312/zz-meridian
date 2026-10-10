import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { may, Unauthenticated } from '@/data/access';
import { ACTIONS } from '@/data/features';
import { SettingsBody, type SettingsMay } from '@/views/settings';

export const metadata = { title: 'Settings' };

/**
 * What this person may do with the workspace. Settings is a `public` feature, so the page never refuses: with no session
 * every flag is false and the sections everyone keeps still render. `workspaceRemove` comes from the delete action's own
 * `needs` (`workspace:remove`), never written here, so the grant has one home.
 */
async function workspaceMay(): Promise<SettingsMay> {
  try {
    return {
      workspaceRead: await may('workspace:read'),
      workspaceUpdate: await may('workspace:update'),
      workspaceRemove: await may(ACTIONS['delete-workspace'].needs),
    };
  } catch (error) {
    if (error instanceof Unauthenticated) return { workspaceRead: false, workspaceUpdate: false, workspaceRemove: false };
    throw error;
  }
}

export default async function SettingsPage() {
  // Task I-13 adds the workspace record read and the save action beside this call; the flags are computed here, on the
  // server, because the view is a client module and never asks the policy itself.
  const permissions = await workspaceMay();
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Settings"
      description={`The workspace, what you hear about, how ${app.name} looks, and what assistants may do.`}
    >
      <SettingsBody may={permissions} />
    </PageFrame>
  );
}
