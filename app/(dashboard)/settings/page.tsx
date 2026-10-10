import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { may, Unauthenticated } from '@/data/access';
import { ACTIONS } from '@/data/features';
import { read } from '@/data/read';
import { SettingsBody, type SettingsMay, type WorkspaceValues } from '@/views/settings';
import { saveWorkspace } from './actions';

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

/**
 * The workspace record, through `read()` like every other collection, so the `workspace:*` grants the role table freezes
 * are asked on the one path. It is read only for someone who may read it, and a policy that does not bind the collection
 * leaves the form on its own defaults rather than failing the page: Settings renders for everyone.
 */
async function workspaceRecord(): Promise<WorkspaceValues | null> {
  try {
    const { rows } = await read('workspace');
    const row = rows[0];
    return row ? { name: String(row.name), slug: String(row.slug), timezone: String(row.timezone) } : null;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  // The flags are computed here, on the server, because the view is a client module and never asks the policy itself;
  // the workspace record and the action that saves it are handed over together, so the section edits what the page read.
  const permissions = await workspaceMay();
  const workspace = permissions.workspaceRead ? await workspaceRecord() : null;
  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="Settings"
      description={`The workspace, what you hear about, how ${app.name} looks, and what assistants may do.`}
    >
      <SettingsBody may={permissions} workspace={workspace} save={saveWorkspace} />
    </PageFrame>
  );
}
