'use client';

import type { ReactNode } from 'react';
import { UserRound } from 'lucide-react';
import { Specimen, State } from '@/system/specimen';
import { Combobox, ComboboxList, type ComboboxOption } from '.';

/** The sample's own people, so the list shows the records a ticket's Assignee field actually offers. */
const PEOPLE: ComboboxOption[] = [
  { value: 'members_2', label: 'Amara Okafor', description: 'Support · Admin' },
  { value: 'members_3', label: 'Priya Nair', description: 'Engineering · Member' },
  { value: 'members_5', label: 'Sofia Rossi', description: 'Design · Member' },
  { value: 'members_19', label: 'Marcus Reed', description: 'Engineering · suspended', disabled: true },
  { value: 'members_12', label: 'Ravi Patel', description: 'Support · Viewer' },
];

const field = 'flex h-(--control-md) items-center gap-2 rounded-md border border-accent bg-surface px-3 text-sm ring-3 ring-accent/22';

/**
 * An open list, drawn where the popover would be: the card's rows inside the popover's surface. It is a listbox only
 * where it holds rows: a state that draws its message and no row is not a list, and a listbox whose children are not
 * options is not valid ARIA.
 */
function List({ id, rows, children }: { id: string; rows: boolean; children: ReactNode }) {
  return (
    <div role={rows ? 'listbox' : undefined} aria-label={id} className="mt-1.5 rounded-lg bg-surface-raised p-1 shadow-overlay">
      {children}
    </div>
  );
}

export default function ComboboxPreview() {
  return (
    <>
      <Specimen label="Field" note="Looks like an Input; the chevron turns when the list is open." stack>
        <div className="grid w-full max-w-160 gap-x-3 gap-y-4 sm:grid-cols-2">
          <State label="With a value"><Combobox aria-label="Assignee" defaultValue="members_2" options={PEOPLE} leading={<UserRound />} /></State>
          <State label="Placeholder"><Combobox aria-label="Assignee" placeholder="Find a person" options={PEOPLE} /></State>
          <State label="Invalid"><Combobox aria-label="Assignee" invalid placeholder="Find a person" options={PEOPLE} /></State>
          <State label="Disabled"><Combobox aria-label="Assignee" disabled defaultValue="members_3" options={PEOPLE} /></State>
        </div>
      </Specimen>
      <Specimen label="Sizes" stack>
        <div className="grid w-full max-w-160 items-end gap-3 sm:grid-cols-3">
          <State label="Small"><Combobox size="sm" aria-label="Small" defaultValue="members_2" options={PEOPLE} /></State>
          <State label="Medium"><Combobox aria-label="Medium" defaultValue="members_2" options={PEOPLE} /></State>
          <State label="Large"><Combobox size="lg" aria-label="Large" defaultValue="members_2" options={PEOPLE} /></State>
        </div>
      </Specimen>
      <Specimen label="Open list" note="Shown inline here; in use it floats under the field. The current person is checked, and the first row is highlighted." stack>
        <div className="w-full max-w-72">
          <div className={field}><span className="flex-1">Amara Okafor</span></div>
          <List id="people" rows><ComboboxList options={PEOPLE} selected="members_2" active={0} rowId={(i) => `cb-open-${i}`} /></List>
        </div>
      </Specimen>
      <Specimen label="Filtered" note="Typing narrows the list; a match on a description counts, and ranks after a match on the name." stack>
        <div className="w-full max-w-72">
          <div className={field}><span className="flex-1">pri</span></div>
          <List id="filtered" rows><ComboboxList options={[PEOPLE[1]!]} query="pri" active={0} rowId={(i) => `cb-filtered-${i}`} /></List>
        </div>
      </Specimen>
      <Specimen label="No match" note="The list says what was typed; it never closes by itself." stack>
        <div className="w-full max-w-72">
          <div className={field}><span className="flex-1">zoe</span></div>
          <List id="no-match" rows={false}><ComboboxList options={[]} query="zoe" rowId={(i) => `cb-nomatch-${i}`} /></List>
        </div>
      </Specimen>
      <Specimen label="Loading" note="Async options: the list waits with its reason, and never says nothing matches while they arrive." stack>
        <div className="w-full max-w-72">
          <div className={field}><span className="flex-1">Sofia</span></div>
          <List id="loading" rows={false}><ComboboxList options={[]} loading rowId={(i) => `cb-loading-${i}`} /></List>
        </div>
      </Specimen>
      <Specimen label="A custom value" note="allowCustom offers the typed text as a value of its own, when customPattern accepts it: ^[A-Z]{3}-\\d{3}$." stack>
        <div className="w-full max-w-72">
          <div className={field}><span className="flex-1">ABC-123</span></div>
          <List id="custom" rows><ComboboxList options={[]} custom="ABC-123" query="ABC-123" active={0} rowId={(i) => `cb-custom-${i}`} /></List>
        </div>
      </Specimen>
      <Specimen label="A custom value refused" note="The same text outside the pattern is not offered; the field's hint says the shape." stack>
        <div className="w-full max-w-72">
          <div className={field}><span className="flex-1">12</span></div>
          <List id="refused" rows={false}><ComboboxList options={[]} query="12" rowId={(i) => `cb-refused-${i}`} /></List>
        </div>
      </Specimen>
    </>
  );
}
