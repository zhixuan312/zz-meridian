'use client';

import { useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip } from 'radix-ui';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame } from '@/components/base/shell';
import { Records } from '@/components/templates/records';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyField } from '@/components/ui/copy-field';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { AskAbout } from '@/components/patterns/ask-about';
import { DataTable, type Column } from '@/components/patterns/data-table';
import { plural } from '@/lib/format';
import { formatDate, formatRelative } from '@/lib/format-date';
import { useLive, type Revisions } from '@/lib/live';
import type { PublicKey } from '@/data/projections';
import { SCOPES, type Scope } from '@/logic/key-scopes';
import { useShareView } from '@/components/base/use-share-view';
import { keysContext } from '@/logic/keys-context';
import type { ActionResult } from '@/lib/collection';


type Draft = { name: string; env: 'live' | 'test'; scopes: Scope[] };

/**
 * The server actions arrive as props: the page owns them, the view only calls them and refreshes the route. `now` is the
 * read's observation time, so "last used" is never fresher than the data. `may` is what the page asked of the action
 * table, so a control the person may not use is not drawn at all, and nothing says why. Defaults allow both, for a view
 * mounted on its own.
 */
export function KeysView({ rows, now, revisions, createKey, revokeKey, may = { create: true, revoke: true } }: { rows: PublicKey[]; now: string; revisions?: Revisions; createKey: (draft: Draft) => Promise<ActionResult<{ key: PublicKey & { secret: string } }>>; revokeKey: (id: string) => Promise<ActionResult>; may?: { create: boolean; revoke: boolean } }) {
  useShareView(keysContext(rows, now, SCOPES));
  const router = useRouter();
  useLive(['keys'], revisions);
  const asOf = new Date(now);
  const [shown, removeShown] = useOptimistic(rows, (xs: PublicKey[], id: string) => xs.filter((k) => k.id !== id));
  const revokingIds = useRef(new Set<string>());
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<PublicKey | null>(null);
  const [fresh, setFresh] = useState<(PublicKey & { secret: string }) | null>(null);
  const [name, setName] = useState('');
  const [env, setEnv] = useState<'live' | 'test'>('live');
  const [scopes, setScopes] = useState<Scope[]>(['messages']);
  const [error, setError] = useState<string | null>(null);
  /** Why the server did not create the key: said inside the open sheet, never in a toast over its button. */
  const [createError, setCreateError] = useState<string | null>(null);

  /** Runs an action, refreshes the route on success, and shows a critical toast, changing nothing, when it is rejected. */
  const run = (action: () => Promise<void>, failed: string) =>
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        toast({ tone: 'critical', title: failed, description: e instanceof Error ? e.message : undefined });
      }
    });

  const create = () => {
    if (!name.trim()) return setError('Name the key after what uses it: "Billing worker".');
    setCreateError(null);
    startTransition(async () => {
      try {
        const r = await createKey({ name, env, scopes });
        if (!r.ok) return setCreateError(r.error);
        const k = r.key;
        setFresh(k);
        setCreating(false);
        setName(''); setScopes(['messages']); setError(null);
        toast({ tone: 'positive', title: 'Key created', description: `${k.name} can call ${k.scopes.join(', ')}.` });
        router.refresh();
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : 'The key could not be created. Try again.');
      }
    });
  };

  /** The revoke control is drawn only for a person who may use it: hidden, never a button that only fails on submit. */
  const revokeColumn: Column<PublicKey> = {
    key: 'revoke', header: <span className="sr-only">Actions</span>, align: 'right', mobile: 'status',
    cell: (k) => <IconButton size="sm" variant="ghost" label={`Revoke ${k.name}`} tooltip icon={<Trash2 />} onClick={() => setRevoking(k)} className="hover:text-critical-ink" />,
  };
  const columns: Column<PublicKey>[] = [
    {
      key: 'name', header: 'Name', grow: true, truncate: true, mobile: 'title', sortValue: (k) => k.name, title: (k) => k.name,
      cell: (k) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="truncate font-medium">{k.name}</span>
          <Badge tone={k.env === 'live' ? 'positive' : 'neutral'} className="capitalize">{k.env}</Badge>
        </span>
      ),
    },
    // The full key is shown once, when it is created; a listed key is known by its hint, which is not a secret. Held on
    // one line: a hint is one token, and a column squeezed by the name beside it broke it into "zzm_live_…" and "f601".
    { key: 'hint', header: 'Key', hideBelow: 'md', cell: (k) => <code className="font-mono text-xs whitespace-nowrap text-ink-2">{k.hint}</code> },
    {
      key: 'scopes', header: 'Scopes', hideBelow: 'xl',
      cell: (k) => (
        <span className="flex items-center gap-1 whitespace-nowrap" title={k.scopes.join(', ')}>
          {k.scopes.length === SCOPES.length ? <Badge>All scopes</Badge> : (
            <>
              {k.scopes.slice(0, 2).map((s) => <Badge key={s}>{s}</Badge>)}
              {k.scopes.length > 2 ? <Badge>+{k.scopes.length - 2}</Badge> : null}
            </>
          )}
        </span>
      ),
    },
    { key: 'owner', header: 'Created by', muted: true, hideBelow: 'lg', cell: (k) => k.owner },
    { key: 'created', header: 'Created', numeric: true, muted: true, hideBelow: 'lg', mobile: 'fact', sortValue: (k) => k.created, cell: (k) => formatDate(k.created), mobileCell: (k) => `Created ${formatDate(k.created)}` },
    {
      key: 'used', header: 'Last used', numeric: true, mobile: 'fact', sortValue: (k) => k.lastUsed ?? '',
      cell: (k) => (k.lastUsed ? formatRelative(k.lastUsed, asOf) : <span className="text-ink-3">Never</span>),
      mobileCell: (k) => (k.lastUsed ? `Used ${formatRelative(k.lastUsed, asOf)}` : 'Never used'),
    },
    ...(may.revoke ? [revokeColumn] : []),
  ];

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="API keys"
      description={`Keys let your services call ${app.name}. Each one carries only the scopes it needs.`}
      actions={may.create ? <Button variant="primary" icon={<Plus />} onClick={() => { setCreateError(null); setCreating(true); }}>Create key</Button> : undefined}
    >
      <Records>
        {/* The secret is shown once, in the scroll region the assistant reads: marked omit, so a question asked while the
            banner is up never sends it. The banner's words still say a key was created. */}
        {fresh ? (
          <Banner tone="accent" icon={<KeyRound />} title={`Copy ${fresh.name} now`} onDismiss={() => setFresh(null)}
            action={<div data-assistant="omit" className="contents"><CopyField value={fresh.secret} label="New key" className="w-[min(26rem,70vw)]" /></div>}>
            This is the only time the full key is shown. Store it in your secret manager.
          </Banner>
        ) : null}
        {/* The page's protagonist, the list, marked on a wrapper whose display is `contents`. Its header counts the keys
            and holds the Ask, which the list has no filter bar to carry. The row's revoke button carries a tooltip; the
            view brings its provider so it also stands alone, as in a test. */}
        <div data-protagonist="API keys" className="contents">
          <Tooltip.Provider delayDuration={300} skipDelayDuration={120}>
            <DataTable
              caption="API keys"
              noun="keys"
              title={`${shown.length} ${plural(shown.length, 'key')}`}
              actions={<AskAbout question="What stands out in the API keys, and why?" />}
              rows={shown}
              columns={columns}
              rowKey={(k) => k.id}
              empty={{ title: 'No keys yet', body: `Create a key for each service that calls ${app.name}.`, action: may.create ? <Button variant="primary" size="sm" icon={<Plus />} onClick={() => { setCreateError(null); setCreating(true); }}>Create key</Button> : undefined }}
            />
          </Tooltip.Provider>
        </div>
        <p className="t-caption max-w-[72ch]">Keys never expire. To rotate one, create its replacement, move your services to it, then revoke the old key: requests signed with it fail at once.</p>
      </Records>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent
          title="Create a key"
          description="The key is shown once, after you create it."
          footer={<><SheetClose asChild><Button variant="ghost">Cancel</Button></SheetClose>{may.create ? <Button variant="primary" onClick={create} disabled={pending || scopes.length === 0}>Create key</Button> : null}</>}
        >
          <div className="flex flex-col gap-6">
            {createError ? <Banner tone="critical" title="Key not created">{createError}</Banner> : null}
            <Field label="Name" hint="Name it after what uses it." error={error ?? undefined} required>
              {(p) => <Input {...p} value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Billing worker" />}
            </Field>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Environment</p>
              <Segmented label="Environment" value={env} onChange={setEnv} options={[{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }]} />
              <p className="t-caption">Test keys reach the sandbox and are never billed.</p>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm font-medium">Scopes</legend>
              {SCOPES.map((s) => (
                <Checkbox key={s} label={s[0].toUpperCase() + s.slice(1)} checked={scopes.includes(s)} onCheckedChange={(on) => setScopes((xs) => (on ? [...xs, s] : xs.filter((x) => x !== s)))} />
              ))}
              {scopes.length === 0 ? <p className="t-caption">Choose at least one scope.</p> : null}
            </fieldset>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={revoking !== null} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent
          size="sm"
          title={`Revoke ${revoking?.name ?? 'this key'}?`}
          description="Requests that use it fail at once with 401. This cannot be undone."
          footer={
            <>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button variant="danger" icon={<Trash2 />} disabled={pending} onClick={() => {
                const k = revoking!;
                if (revokingIds.current.has(k.id)) return;
                revokingIds.current.add(k.id);
                setRevoking(null);
                run(async () => {
                  removeShown(k.id);
                  let r;
                  try {
                    r = await revokeKey(k.id);
                  } finally {
                    revokingIds.current.delete(k.id);
                  }
                  if (!r.ok) throw new Error(r.error);
                  toast({ tone: 'neutral', title: 'Key revoked', description: `${k.name} no longer works.` });
                }, 'Could not revoke the key');
              }}>Revoke key</Button>
            </>
          }
        >
          {revoking ? <p className="t-small text-ink-2">Last used {revoking.lastUsed ? formatRelative(revoking.lastUsed, asOf) : 'never'} by {revoking.owner}&rsquo;s services.</p> : null}
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}
