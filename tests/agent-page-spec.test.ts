import { describe, expect, test } from 'vitest';
import { agentPageSpec } from '../scripts/lib/routes.ts';

// The gate asks every console page and embed view to say what the agent reads. An adopted project keeps the route
// group it had, so the rule follows the group, whatever it is called: under a fixed name it matched nothing there and
// passed a console in which no page said anything (issue #23).
//
// A page's specification belongs to its own folder, whatever the console route group is called.
const spec = (folder: string) => `${folder}/README.md`;

describe('which page specifications must say what the agent reads', () => {
  test('a page in the route group at the top of the app folder, by any name, and an embed view', () => {
    for (const folder of ['app/(dashboard)/requests', 'app/(dash)/teams', 'app/(console)/(home)', 'app/embed/now']) expect(agentPageSpec(spec(folder), 'app'), folder).toBe(true);
    expect(agentPageSpec(spec('src/app/(dash)/teams'), 'src/app')).toBe(true);
  });

  test('not a page outside the console: sign-in, the Atlas and its own groups, a file elsewhere', () => {
    for (const folder of ['app/sign-in', 'app/system/(atlas)/pages', 'app/not-found', 'src/components/ui/button', 'app']) expect(agentPageSpec(spec(folder), 'app'), folder).toBe(false);
  });
});
