'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3, CircleDollarSign } from 'lucide-react';
import { nav, type NavItem } from '@/app.config';
import { Specimen } from '@/system/specimen';
import { Rail } from '.';

type RailProps = Parameters<typeof Rail>[0];

const Column = ({ current, label, user, scopes, workspace, viewAs, groups = nav, closeBranch }: { current: string; label: string; user?: null; groups?: RailProps['nav']; scopes?: RailProps['scopes']; workspace?: string; viewAs?: RailProps['viewAs']; closeBranch?: string }) => {
  const box = useRef<HTMLDivElement>(null);
  // Only a person's close leaves a branch closed while the page inside it is current, so this column closes it after mount, as a person would. It presses the button only while it reads open, which keeps it idempotent when strict mode runs the effect twice.
  useEffect(() => {
    if (!closeBranch) return;
    const button = box.current?.querySelector<HTMLButtonElement>(`button[aria-label="${closeBranch} pages"]`);
    if (button?.getAttribute('aria-expanded') === 'true') button.click();
  }, [closeBranch]);
  return (
    <figure className="flex flex-col gap-2">
      <div ref={box} className="relative h-150 w-(--rail-width) overflow-hidden rounded-lg border border-line bg-frame backdrop-blur-xl">
        <Rail nav={groups} current={current} user={user} scopes={scopes} workspace={workspace} viewAs={viewAs} />
      </div>
      <figcaption className="text-2xs text-ink-3">{label}</figcaption>
    </figure>
  );
};

/**
 * A navigation of the preview's own, never read from the configured one: a group with a parent (Usage), one sub page
 * under it (Requests) and one more item (Revenue). A product that drops any of these pages still draws every column.
 */
const REVENUE: NavItem = { href: '/business', label: 'Revenue', icon: CircleDollarSign, needs: 'public' };
const USAGE: NavItem = { href: '/usage', label: 'Usage', icon: BarChart3, needs: 'public' };
const REQUESTS: NavItem = { href: '/requests', label: 'Requests', icon: Activity, needs: 'public', under: '/usage' };
const BRANCH: RailProps['nav'] = [{ label: 'Traffic', items: [REVENUE, USAGE, REQUESTS] }];
/** What the person may open leaves out the sub pages (the parent is a plain item), or the parent (the sub page is a plain item with its icon). */
const WITHOUT_SUBS: RailProps['nav'] = [{ label: 'Traffic', items: [REVENUE, USAGE] }];
const WITHOUT_PARENT: RailProps['nav'] = [{ label: 'Traffic', items: [REVENUE, REQUESTS] }];

/** The configured navigation with a count on Services: the configuration carries none, so this specimen draws one of its own. */
const WITH_COUNT = nav.map((group) => ({ ...group, items: group.items.map((item) => (item.href === '/services' ? { ...item, badge: '1' } : item)) }));

/** The sample personas, in the order the View as group lists them: the demo signs in as the first until one is chosen. */
const PERSONAS = ['Maya Chen', 'Jonas Weber', 'Priya Nair', 'Lucas Meyer', 'Grace Liu'];
const SCOPES = [{ id: 'northwind', label: 'Northwind' }, { id: 'contoso', label: 'Contoso' }];

/** Two workspaces, kept in the preview's own state: choosing one moves the check and the line under the product name. */
function SeveralWorkspaces() {
  const [at, setAt] = useState(SCOPES[0].id);
  const scopes = SCOPES.map((s) => ({ ...s, active: s.id === at, onSelect: () => setAt(s.id) }));
  return <Column current="/" label="Two workspaces: open the row, choose one" scopes={scopes} workspace={scopes.find((s) => s.active)!.label} />;
}

/** The five sample personas; the last is not Active, so it is listed and out of reach. The one chosen moves the check. */
function ViewAs() {
  const [current, setCurrent] = useState('persona-0');
  const options = PERSONAS.map((label, i) => ({ id: `persona-${i}`, label, disabled: i === PERSONAS.length - 1 }));
  return <Column current="/" label="Maya Chen is in view; the last persona is listed, out of reach" viewAs={{ current, options, choose: (id) => { setCurrent(id); return Promise.resolve(); } }} />;
}

export default function RailPreview() {
  return (
    <>
      <Specimen label="The rail" note="260px, on a translucent wash over the lit ground. The current page is an accent-tinted pill with a lit edge; it springs to the item you choose.">
        <div className="flex flex-wrap gap-6">
          <Column current="/" label="Home is current" />
          <Column current="/services" groups={WITH_COUNT} label="Services is current, with a count badge a product sets on an entry (the sample sets none)" />
          <Column current="/" user={null} label="The session is still being found out: a skeleton, not a name" />
        </div>
      </Specimen>
      <Specimen label="Sub pages" note="An item that another names with under is drawn as a branch under it, on a guide line, without an icon. The parent is a link to its own page and a button beside it, named Usage pages, opens and closes the branch; a closed branch draws none of its links. Open a column's button to see it move. Every column is the real Rail on a navigation of its own: Revenue, Usage, and Requests under Usage.">
        <div className="flex flex-wrap gap-6">
          <Column groups={BRANCH} current="/business" label="The branch closed, the current page outside it" />
          <Column groups={BRANCH} current="/requests" label="The branch open, a sub page current: the guide line is lit beside it and the parent's icon takes the accent" />
          <Column groups={BRANCH} current="/requests" closeBranch="Usage" label="The branch closed while a sub page is current: the parent carries the pill, so the rail still shows where the person is" />
          <Column groups={WITHOUT_SUBS} current="/usage" label="The person may not open the sub pages: the navigation passed without them, so Usage is a plain item with no button" />
          <Column groups={WITHOUT_PARENT} current="/requests" label="The person may not open the parent: the navigation passed without Usage, so Requests is a plain item with its icon" />
          <Column groups={BRANCH} current="/usage" label="The branch open. On a touch screen its rows are 44px tall and its button 44 by 44; this is the fine-pointer size, and a phone opening the Atlas draws the larger one" />
        </div>
      </Specimen>
      <Specimen label="View as" note="The foot of the workspace menu, the real one: open the row to see it. The five sample personas, in order, the one in view checked and the last listed but out of reach; choosing one moves the check. It mounts only on open, so no persona's name reaches a page's first HTML.">
        <div className="flex flex-wrap gap-6">
          <ViewAs />
        </div>
      </Specimen>
      <Specimen label="Several workspaces" note="A product that passes more than one workspace or scope gets the Show group — radio items with the one in view checked — and its row is a switcher (ChevronsUpDown). Open the row to see the menu; choosing a workspace moves the check and the line under the product name. One workspace or none is nothing to switch between: the row is the account menu, with a plain chevron, and the menu holds no Show group and no checked row of its own, as in the first specimen.">
        <div className="flex flex-wrap gap-6">
          <SeveralWorkspaces />
        </div>
      </Specimen>
      <Specimen label="Below 1024px" note="The same rail opens as a drawer from the menu button in the top bar; it closes on Escape, on the scrim and on navigation.">
        <p className="t-small max-w-[60ch] text-ink-2">One node, rendered in two places: nothing about navigation is defined twice.</p>
      </Specimen>
    </>
  );
}
