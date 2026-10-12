'use client';

import { useState } from 'react';
import { nav } from '@/app.config';
import { Specimen } from '@/system/specimen';
import { Rail } from '.';

type RailProps = Parameters<typeof Rail>[0];

const Column = ({ current, label, user, scopes, workspace, viewAs, groups = nav }: { current: string; label: string; user?: null; groups?: RailProps['nav']; scopes?: RailProps['scopes']; workspace?: string; viewAs?: RailProps['viewAs'] }) => (
  <figure className="flex flex-col gap-2">
    <div className="relative h-150 w-(--rail-width) overflow-hidden rounded-lg border border-line bg-frame backdrop-blur-xl">
      <Rail nav={groups} current={current} user={user} scopes={scopes} workspace={workspace} viewAs={viewAs} />
    </div>
    <figcaption className="text-2xs text-ink-3">{label}</figcaption>
  </figure>
);

/** The configured navigation with a count on Operations: the configuration carries none, so this specimen draws one of its own. */
const WITH_COUNT = nav.map((group) => ({ ...group, items: group.items.map((item) => (item.href === '/health' ? { ...item, badge: '1' } : item)) }));

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
          <Column current="/" label="Overview is current" />
          <Column current="/health" groups={WITH_COUNT} label="Operations is current; its badge counts one open incident" />
          <Column current="/" user={null} label="The session is still being found out: a skeleton, not a name" />
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
