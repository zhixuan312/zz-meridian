'use client';

import { useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { app } from '@/app.config';
import { PageFrame, Stack } from '@/components/base/shell';
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
import { DataTable, type Column } from '@/components/patterns/data-table';
import { formatDate, formatRelative } from '@/lib/format-date';
import { DEMO_NOW } from '@/system/fixtures/relay';
import type { ApiKey } from '@/system/fixtures/relay-records';

const SCOPES = ['messages', 'search', 'embeddings', 'files', 'webhooks'];

export function KeysView({ initial }: { initial: ApiKey[] }) {
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [fresh, setFresh] = useState<ApiKey | null>(null);
  const [name, setName] = useState('');
  const [env, setEnv] = useState<'live' | 'test'>('live');
  const [scopes, setScopes] = useState<string[]>(['messages']);
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    if (!name.trim()) return setError('Name the key after what uses it: "Billing worker".');
    const k: ApiKey = {
      id: `key_${keys.length + 10}`, name: name.trim(), env, scopes, owner: 'Maya Chen', created: DEMO_NOW.toISOString(), lastUsed: null,
      secret: `rk_${env}_${Array.from({ length: 32 }, (_, i) => '0123456789abcdef'[(i * 7 + name.length * 3) % 16]).join('')}`,
    };
    setKeys((ks) => [k, ...ks]);
    setFresh(k);
    setCreating(false);
    setName(''); setScopes(['messages']); setError(null);
    toast({ tone: 'positive', title: 'Key created', description: `${k.name} can call ${k.scopes.join(', ')}.` });
  };

  const columns: Column<ApiKey>[] = [
    {
      key: 'name', header: 'Name', mobile: 'title', sortValue: (k) => k.name,
      cell: (k) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="truncate font-medium">{k.name}</span>
          <Badge tone={k.env === 'live' ? 'positive' : 'neutral'} className="font-mono uppercase">{k.env}</Badge>
        </span>
      ),
    },
    { key: 'secret', header: 'Key', grow: true, hideBelow: 'md', cell: (k) => <CopyField value={k.secret} label={`${k.name} key`} secret className="max-w-80" /> },
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
    { key: 'owner', header: 'Created by', muted: true, hideBelow: 'lg', cell: (k) => <span className="whitespace-nowrap">{k.owner}</span> },
    { key: 'created', header: 'Created', numeric: true, muted: true, mobile: 'fact', sortValue: (k) => k.created, cell: (k) => formatDate(k.created), mobileCell: (k) => `Created ${formatDate(k.created)}` },
    {
      key: 'used', header: 'Last used', numeric: true, mobile: 'fact', sortValue: (k) => k.lastUsed ?? '',
      cell: (k) => (k.lastUsed ? formatRelative(k.lastUsed, DEMO_NOW) : <span className="text-ink-3">Never</span>),
      mobileCell: (k) => (k.lastUsed ? `Used ${formatRelative(k.lastUsed, DEMO_NOW)}` : 'Never used'),
    },
    {
      key: 'revoke', header: <span className="sr-only">Actions</span>, align: 'right', mobile: 'status',
      cell: (k) => <IconButton size="sm" variant="ghost" label={`Revoke ${k.name}`} tooltip icon={<Trash2 />} onClick={() => setRevoking(k)} className="hover:text-critical-ink" />,
    },
  ];

  return (
    <PageFrame
      kicker={<>{app.name} · {app.workspace}</>}
      title="API keys"
      description="Keys let your services call Relay. Each one carries only the scopes it needs."
      actions={<Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>Create key</Button>}
    >
      <Stack>
        {fresh ? (
          <Banner tone="accent" icon={<KeyRound />} title={`Copy ${fresh.name} now`} onDismiss={() => setFresh(null)}
            action={<CopyField value={fresh.secret} label="New key" className="w-[min(26rem,70vw)]" />}>
            This is the only time the full key is shown. Store it in your secret manager.
          </Banner>
        ) : null}
        <DataTable
          caption="API keys"
          noun="keys"
          rows={keys}
          columns={columns}
          rowKey={(k) => k.id}
          empty={{ title: 'No keys yet', body: 'Create a key for each service that calls Relay.', action: <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setCreating(true)}>Create key</Button> }}
        />
      </Stack>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent
          title="Create a key"
          description="The key is shown once, after you create it."
          footer={<><SheetClose asChild><Button variant="ghost">Cancel</Button></SheetClose><Button variant="primary" onClick={create}>Create key</Button></>}
        >
          <div className="flex flex-col gap-6">
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
              <Button variant="danger" icon={<Trash2 />} onClick={() => {
                const k = revoking!;
                setKeys((ks) => ks.filter((x) => x.id !== k.id));
                setRevoking(null);
                toast({ tone: 'neutral', title: 'Key revoked', description: `${k.name} no longer works.` });
              }}>Revoke key</Button>
            </>
          }
        >
          {revoking ? <p className="t-small text-ink-2">Last used {revoking.lastUsed ? formatRelative(revoking.lastUsed, DEMO_NOW) : 'never'} by {revoking.owner}&rsquo;s services.</p> : null}
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
}
