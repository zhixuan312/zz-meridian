'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { DIALOG_BODY, DIALOG_FOOT, DIALOG_HEAD, DIALOG_PANEL, Dialog, DialogContent, DialogTrigger } from '.';

function Panel({ title, description, children, footer, className }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(DIALOG_PANEL, 'w-full max-w-130 rounded-xl', className)}>
      <div className={DIALOG_HEAD}>
        <div className="min-w-0 flex-1">
          <p className="t-section">{title}</p>
          {description ? <p className="t-small mt-1.5 text-ink-2">{description}</p> : null}
        </div>
        <span className="-mt-0.5 -mr-2 grid size-8 place-items-center rounded-md text-ink-3"><X className="size-4" /></span>
      </div>
      <div className={DIALOG_BODY}>{children}</div>
      {footer ? <div className={DIALOG_FOOT}>{footer}</div> : null}
    </div>
  );
}

export default function DialogPreview() {
  return (
    <>
      <Specimen label="Confirm" note="Says what will happen and what it touches; the destructive action is last and named.">
        <div className="grid w-full place-items-center rounded-lg bg-scrim p-8 max-sm:p-3">
          <Panel
            title="Revoke this key?"
            description="Requests signed with relay_live_7Hc2…q91 will fail with 401 at once. This cannot be undone."
            footer={<><Button variant="ghost">Cancel</Button><Button variant="danger">Revoke key</Button></>}
          >
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 rounded-md bg-surface-sunk px-4 py-3 text-sm">
              <dt className="text-ink-3">Key</dt><dd className="truncate font-mono text-xs leading-5">relay_live_7Hc2…q91</dd>
              <dt className="text-ink-3">Last used</dt><dd>4 minutes ago, from 34.201.88.12</dd>
              <dt className="text-ink-3">Requests today</dt><dd className="t-num">18,402</dd>
            </dl>
          </Panel>
        </div>
      </Specimen>
      <Specimen label="Form" note="A short task: fields in the body, the primary action in the footer.">
        <div className="grid w-full place-items-center rounded-lg bg-scrim p-8 max-sm:p-3">
          <Panel title="Create API key" description="Keys are shown once. Store it in your secrets manager." footer={<><Button variant="ghost">Cancel</Button><Button variant="primary">Create key</Button></>}>
            <label className="block text-sm font-medium">Name</label>
            <div className="mt-1.5 flex h-(--control-md) items-center rounded-md border border-line-strong bg-surface px-3 text-sm shadow-control">Production · billing worker</div>
            <p className="t-caption mt-1.5">Only you and admins see the name.</p>
          </Panel>
        </div>
      </Specimen>
      <Specimen label="Live" note="Opens centred; on phones it rises from the bottom as a sheet.">
        <Dialog>
          <DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger>
          <DialogContent title="Revoke this key?" description="Requests signed with it will fail with 401 at once." footer={<Button variant="danger">Revoke key</Button>}>
            <p className="t-small text-ink-2">Any service still using it will need a new key.</p>
          </DialogContent>
        </Dialog>
      </Specimen>
    </>
  );
}
