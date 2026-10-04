'use client';

import { useState } from 'react';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormSection, SettingRow } from '.';
import { app, domain } from '@/app.config';

export default function FormSectionPreview() {
  const [name, setName] = useState(`${app.name} ${app.workspace} (EU)`);
  return (
    <>
      <Specimen label="Dirty" note="An edit shows the save bar; it stays in view until saved or discarded." stack>
        <FormSection title="Workspace" description={`How this workspace is named across ${app.name}.`} dirty onDiscard={() => setName(`${app.name} ${app.workspace}`)} onSave={() => {}}>
          <Field label="Name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        </FormSection>
      </Specimen>
      <Specimen label="Error" note="A failed save keeps the edit and says why, above the fields." stack>
        <FormSection title="Workspace" description={`How this workspace is named across ${app.name}.`} dirty error="The name is taken by another workspace in this organisation. Choose another." onSave={() => {}} onDiscard={() => {}}>
          <Field label="Name">{(p) => <Input {...p} defaultValue={app.name} />}</Field>
        </FormSection>
      </Specimen>
      <Specimen label="Read-only" note="Says who can change it, instead of disabling silently." stack>
        <FormSection title="Billing contact" readOnly="Only an owner can change billing. Ask Maya Chen.">
          <Field label="Email">{(p) => <Input {...p} defaultValue={`finance@${domain}`} />}</Field>
        </FormSection>
      </Specimen>
      <Specimen label="Layout only" note="No form around the card, so it can hold a table that runs edge to edge — or a form of its own, since forms cannot nest. Nothing submits, so a setting that applies at once simply sits in the same layout." stack>
        <FormSection as="div" flush title="Access tokens" description="Tokens this workspace has issued. A token is shown once, when it is created.">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Last used</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow><TableCell>ci-deploy</TableCell><TableCell muted>2 days ago</TableCell></TableRow>
              <TableRow><TableCell>grafana-read</TableCell><TableCell muted>Never</TableCell></TableRow>
            </TableBody>
          </Table>
        </FormSection>
      </Specimen>
      <Specimen label="Applies at once" note="No onSave: switches take effect immediately and the footnote says so." stack>
        <FormSection title="Notifications" description={`What ${app.name} emails you about.`} footnote="Changes apply at once.">
          <Switch label="Incident alerts" description="When a service is degraded or down." defaultChecked />
          <Switch label="Weekly digest" description="Every Monday." />
        </FormSection>
      </Specimen>
      <Specimen label="Danger zone" stack>
        <FormSection tone="critical" title="Danger zone" description="Deleting removes every key, log and chart. It cannot be undone.">
          <SettingRow label="Delete this workspace" description="API keys stop working at once.">
            <Button variant="danger">Delete workspace</Button>
          </SettingRow>
        </FormSection>
      </Specimen>
    </>
  );
}
