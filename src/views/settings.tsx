'use client';


import { Suspense, createContext, use, useCallback, useContext, useEffect, useState } from 'react';
import { useShareView } from '@/components/base/use-share-view';
import type { SharedContext } from '@/lib/shared-context';
import { Lock, Moon, Monitor, Sun } from 'lucide-react';
import { app, domain, workspaceSlug } from '@/app.config';
import { ACCENTS } from '@/lib/preferences';
import { usePreferences } from '@/components/base/providers';
import { useAssistantAvailable } from '@/components/base/shell';
import { FormSection, SettingRow } from '@/components/patterns/form-section';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import type { Result } from './members';

/** Settings, in sections that save on their own. */
/** Each section reports where it stands now, in a line, so the page's shared context holds what inputs and switches show (decision 0011). */
const Report = createContext<(section: string, line: string) => void>(() => {});
function useReport(section: string, line: string) {
  const report = useContext(Report);
  useEffect(() => report(section, line), [report, section, line]);
}

const SECTIONS = ['Workspace', 'Appearance', 'Assistant', 'Agents and MCP'];

/** Settings as both agents read it: every section's current values, which an input's or a switch's text does not carry. */
export function settingsContext(lines: Record<string, string>): SharedContext {
  return {
    view: 'settings',
    title: 'Settings',
    address: '/settings',
    scope: 'this workspace\'s settings, and this device\'s appearance',
    facts: SECTIONS.filter((k) => lines[k]).map((k) => ({ label: k, value: lines[k] })),
    insights: [],
    unknowns: ['A setting an agent wants changed is the person\'s to change here: none of these is offered to an agent as a change.'],
  };
}

/** What this person may do with the workspace, computed on the server with `may` and passed in: the view is a client module, so it never asks the policy itself. */
export type SettingsMay = {
  workspaceRead: boolean;
  workspaceUpdate: boolean;
};

/** The workspace as the page read it through the collection: the name the section edits, and the address it shows. */
export type WorkspaceValues = { name: string; slug: string };

/** The server action the section saves through: the shared `Result`, and never a thrown error at the person. */
export type SaveWorkspace = (input: { name: string }) => Promise<Result>;

/**
 * What the form shows when the page hands it no record: the identity the sample has always shown. The page reads the
 * `workspace` collection and passes it; this is the fallback for a policy that does not bind the collection, and for the
 * checks that render this view on its own.
 */
const WORKSPACE_DEFAULTS: WorkspaceValues = { name: `${app.name} ${app.workspace}`, slug: workspaceSlug };

/**
 * Settings, split by need: Appearance, Assistant and Agents and MCP are for everyone; the Workspace follows `may`. A
 * person who may not change the workspace sees its fields read-only, marked so and naming nobody who could change them,
 * and never a control that would refuse: no save bar.
 */
export function SettingsBody({ may, workspace, save }: { may: SettingsMay; workspace?: WorkspaceValues | null; save?: SaveWorkspace }) {
  const [lines, setLines] = useState<Record<string, string>>({});
  const report = useCallback((section: string, line: string) => setLines((l) => (l[section] === line ? l : { ...l, [section]: line })), []);
  useShareView(settingsContext(lines));
  return (
    <Report value={report}>
    <div className="flex flex-col gap-14">
      {may.workspaceRead ? <Workspace may={may} record={workspace ?? WORKSPACE_DEFAULTS} save={save} /> : null}
      <Appearance />
      <Assistant />
      <Agents />
    </div>
    </Report>
  );
}

function Workspace({ may, record, save }: { may: SettingsMay; record: WorkspaceValues; save?: SaveWorkspace }) {
  const [v, setV] = useState(record);
  const [base, setBase] = useState(record);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Only a person who may change the workspace has anything to save or discard; everyone else reads the values as they are.
  const editable = may.workspaceUpdate;
  const dirty = editable && JSON.stringify(v) !== JSON.stringify(base);
  const nameError = v.name.trim() === '' ? 'Give the workspace a name: an invitation names it.' : undefined;
  useReport('Workspace', `name "${base.name}", address app.${domain}/${base.slug}${dirty ? `; unsaved edit: name "${v.name}"` : ''}`);
  return (
    <FormSection
      title="Workspace"
      description="What this workspace is called. An invitation to join names it."
      dirty={dirty}
      saving={saving}
      error={error}
      onDiscard={() => { setV(base); setError(undefined); }}
      onSave={editable ? async () => {
        if (nameError) return;
        setSaving(true);
        setError(undefined);
        // The values, not the promise, decide: a refusal is a sentence beside the fields, and the form keeps the edits.
        // What is saved is the name without the space around it, so that is what the field and the context then hold.
        const saved = { ...v, name: v.name.trim() };
        const result = save ? await save({ name: saved.name }) : { ok: true } as Result;
        setSaving(false);
        if (!result.ok) { setError(result.error); return; }
        setV(saved);
        setBase(saved);
        toast({ tone: 'positive', title: 'Workspace saved' });
      } : undefined}
      readOnly={!editable}
    >
      <Field label="Name" error={nameError}>
        {(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
      </Field>
      <AddressValue slug={v.slug} />
    </FormSection>
  );
}

/**
 * The workspace's address, which is read and never typed here: it is set when the workspace is created. A field that
 * refuses input is the wrong control for it, and a one-line field is narrower than the address on a phone, so the
 * address was cut to "app.zz-meridian.example/zz-meridian-p" with no ellipsis and no way to see the rest. It is a value
 * instead, whole and wrapping, with the label and hint a field would have had. The label is a paragraph rather than a
 * `<label>`: nothing here is labelable, and a `for` pointing at a paragraph names nothing.
 */
function AddressValue({ slug }: { slug: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-sm font-medium text-ink">Address</p>
      <p className="font-mono text-xs text-pretty text-ink-2 [overflow-wrap:anywhere]">app.{domain}/{slug}</p>
      <p className="text-xs leading-snug text-ink-3">It is set when the workspace is created and is not changed here.</p>
    </div>
  );
}

function Appearance() {
  const { prefs, set } = usePreferences();
  useReport('Appearance', `on this device: theme ${prefs.theme}, accent ${prefs.accent}, density ${prefs.density}`);
  return (
    <FormSection title="Appearance" description={`How ${app.name} looks on this device. It applies at once and is kept on this device only.`}>
      <SettingRow label="Theme" description="System follows your device.">
        <Segmented
          label="Theme"
          value={prefs.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: 'system', label: <><Monitor className="size-3.5" />System</> },
            { value: 'dark', label: <><Moon className="size-3.5" />Dark</> },
            { value: 'light', label: <><Sun className="size-3.5" />Light</> },
          ]}
        />
      </SettingRow>
      <SettingRow label="Accent" description="The one colour that marks the main action and the finding.">
        <div role="radiogroup" aria-label="Accent" className="flex items-center gap-1.5">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={prefs.accent === a}
              aria-label={a[0].toUpperCase() + a.slice(1)}
              title={a[0].toUpperCase() + a.slice(1)}
              onClick={() => set({ accent: a })}
              className="press hit grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink-2"
            >
              <span data-accent={a} className="size-5.5 rounded-full bg-accent ring-1 ring-line" />
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Density" description="Compact fits more rows on a screen.">
        <Segmented label="Density" value={prefs.density} onChange={(density) => set({ density })} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
      </SettingRow>
    </FormSection>
  );
}

/** The Assistant section's place while the request says whether there is an assistant: the section's own height, nothing to read or press. */
function AssistantPlace() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-96 max-w-full" />
      <Skeleton className="h-9 w-full max-w-lg rounded-md" />
    </div>
  );
}

function Assistant() {
  const available = useAssistantAvailable();
  return (
    <Suspense fallback={<AssistantPlace />}>
      <AssistantSection available={available} />
    </Suspense>
  );
}

function AssistantSection({ available }: { available: Promise<boolean> }) {
  const { prefs, set } = usePreferences();
  const has = use(available);
  useReport('Assistant', has ? `the assistant is ${prefs.assistant ? 'shown' : 'hidden'} on this device` : 'this product has no assistant');
  if (!has) return null;
  return (
    <FormSection title="Assistant" description={`The assistant answers questions about ${app.name} and proposes changes for you to approve.`}>
      <Switch
        label="Show the assistant"
        description="The panel and its launcher in the top bar. Your conversation stays on this device, and hiding the assistant keeps it."
        checked={prefs.assistant}
        onCheckedChange={(on) => { set({ assistant: on }); toast({ tone: 'neutral', title: on ? 'Assistant shown' : 'Assistant hidden' }); }}
      />
    </FormSection>
  );
}

function Agents() {
  useReport('Agents and MCP', 'every proposed change waits for approval (always on)');
  return (
    <FormSection
      title="Agents and MCP"
      description={`Assistants that open ${app.name}'s views inside a chat. They can read what you can read; they change nothing without you.`}
    >
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface-sunk px-3.5 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Every change an assistant proposes waits for approval</p>
          <p className="t-caption mt-0.5 text-pretty">This is always on. A proposal shows what changes, before and after, and why; nothing runs until a person approves it. A removal is proposed like any other change, marked critical, and runs only when approved.</p>
        </div>
      </div>
    </FormSection>
  );
}
