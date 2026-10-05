'use client';

import { Suspense, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Lock, Moon, Monitor, Sun, Trash2 } from 'lucide-react';
import { app, domain, workspaceSlug } from '@/app.config';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format-date';
import { ACCENTS } from '@/lib/preferences';
import { usePreferences } from '@/components/base/providers';
import { useAssistantAvailable } from '@/components/base/shell';
import { FormSection, SettingRow } from '@/components/patterns/form-section';
import { AgentMark } from '@/components/ui/agent-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { DEMO_NOW, CONNECTED_HOSTS, TIMEZONES } from '@/data/sample';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Settings, in sections that save on their own. */
export function SettingsBody() {
  return (
    <div className="flex flex-col gap-14">
      <Workspace />
      <Notifications />
      <Appearance />
      <Assistant />
      <Agents />
      <Danger />
    </div>
  );
}

function Workspace() {
  const saved = { name: `${app.name} ${app.workspace}`, slug: workspaceSlug, timezone: app.timezone as string };
  const [v, setV] = useState(saved);
  const [base, setBase] = useState(saved);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(base);
  const nameError = v.name.trim() === '' ? 'Give the workspace a name: it appears in the rail and on invitations.' : undefined;
  return (
    <FormSection
      title="Workspace"
      description="How this workspace is named, and the time zone every date and daily total is cut on."
      dirty={dirty}
      saving={saving}
      onDiscard={() => setV(base)}
      onSave={async () => {
        if (nameError) return;
        setSaving(true);
        await wait(700);
        setBase(v);
        setSaving(false);
        toast({ tone: 'positive', title: 'Workspace saved' });
      }}
    >
      <Field label="Name" error={nameError}>
        {(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}
      </Field>
      <Field label="Address" hint="Used in links you share. Only an owner can change it.">
        {(p) => <Input {...p} value={`app.${domain}/${v.slug}`} readOnly leading={<Globe className="size-4" />} className="font-mono text-xs" />}
      </Field>
      <Field label="Time zone" hint="Daily totals and charts are cut at midnight in this zone.">
        {(p) => <Select {...p} value={v.timezone} onValueChange={(timezone) => setV({ ...v, timezone })} options={TIMEZONES} />}
      </Field>
    </FormSection>
  );
}

function Notifications() {
  const [n, setN] = useState({ incidents: true, digest: true, budget: false, proposals: true });
  const flip = (k: keyof typeof n, label: string) => (on: boolean) => {
    setN({ ...n, [k]: on });
    toast({ tone: 'neutral', title: `${label} ${on ? 'on' : 'off'}` });
  };
  return (
    <FormSection title="Notifications" description={`What ${app.name} emails you about. Each switch applies at once.`} footnote={`Sent to maya@${domain}. Incident alerts also reach the on-call channel.`}>
      <Switch label="Incident alerts" description="When a service is degraded or down, and when it recovers." checked={n.incidents} onCheckedChange={flip('incidents', 'Incident alerts')} />
      <Switch label="Weekly digest" description="Traffic, errors and spend for the week, every Monday." checked={n.digest} onCheckedChange={flip('digest', 'Weekly digest')} />
      <Switch label="Spend over budget" description="When this month's spend passes the budget you set." checked={n.budget} onCheckedChange={flip('budget', 'Spend alerts')} />
      <Switch label="Agent proposals" description="When an assistant proposes a change that waits for you." checked={n.proposals} onCheckedChange={flip('proposals', 'Proposal emails')} />
    </FormSection>
  );
}

function Appearance() {
  const { prefs, set } = usePreferences();
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
  if (!use(available)) return null;
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
  const [read, setRead] = useState(true);
  const [hosts, setHosts] = useState(CONNECTED_HOSTS);
  return (
    <FormSection
      title="Agents and MCP"
      description={`Assistants that open ${app.name}'s views inside a chat. They can read what you can read; they change nothing without you.`}
    >
      <Switch
        label="Let assistants read dashboards"
        description="Connected assistants can open Overview, Requests and Health, and see what is on screen when you share a view."
        checked={read}
        onCheckedChange={(on) => { setRead(on); toast({ tone: 'neutral', title: on ? 'Assistants can read dashboards' : 'Assistants can no longer read dashboards' }); }}
      />
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface-sunk px-3.5 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Every change an assistant proposes waits for approval</p>
          <p className="t-caption mt-0.5 text-pretty">This is always on. A proposal shows what changes, before and after, and why; nothing runs until a person approves it. A removal is proposed like any other change, marked critical, and runs only when approved.</p>
        </div>
      </div>
      <div>
        <p className="t-eyebrow mb-2.5">Connected · {hosts.length}</p>
        {hosts.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
            {hosts.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3">
                <AgentMark size="lg" />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex items-center gap-2 text-sm font-medium">{h.name}<Badge>{h.kind}</Badge></p>
                  <p className="t-caption mt-0.5">Connected by {h.connectedBy} · last used {formatRelative(h.lastUsed, DEMO_NOW)}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">{h.scopes.map((s) => <Badge key={s} tone={s.startsWith('Propose') ? 'accent' : 'neutral'}>{s}</Badge>)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHosts((list) => list.filter((x) => x.id !== h.id));
                    toast({ tone: 'neutral', title: `${h.name} disconnected`, action: { label: 'Undo', onClick: () => setHosts((list) => [...list, h]) } });
                  }}
                >
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-line-strong px-3.5 py-4 text-sm text-ink-3">No assistant is connected. Add {app.name}&rsquo;s MCP server to an assistant to open these views there.</p>
        )}
      </div>
    </FormSection>
  );
}

function Danger() {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const confirm = workspaceSlug;
  const ok = typed.trim() === confirm;
  return (
    <FormSection tone="critical" title="Danger zone" description="Deleting removes every key, log and chart of this workspace. It cannot be undone.">
      <SettingRow label="Delete this workspace" description="API keys stop working at once; requests in flight fail.">
        <Dialog onOpenChange={(o) => !o && setTyped('')}>
          <DialogTrigger asChild>
            <Button variant="danger" icon={<Trash2 />}>Delete workspace</Button>
          </DialogTrigger>
          <DialogContent
            size="sm"
            title={`Delete ${app.name} ${app.workspace}?`}
            description="Every API key stops working at once and the logs are erased. There is no undo."
            footer={
              <>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <DialogClose asChild>
                  <Button variant="danger" disabled={!ok} onClick={() => { toast({ tone: 'neutral', title: `${app.name} ${app.workspace} deleted`, description: 'Its keys stopped working. Sign in to another workspace.' }); router.push('/sign-in'); }}>Delete workspace</Button>
                </DialogClose>
              </>
            }
          >
            <Field label={<>Type <span className="font-mono text-critical-ink">{confirm}</span> to confirm</>}>
              {(p) => <Input {...p} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} className={cn('font-mono text-xs')} />}
            </Field>
          </DialogContent>
        </Dialog>
      </SettingRow>
    </FormSection>
  );
}
