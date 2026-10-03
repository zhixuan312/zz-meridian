'use client';

import { useState } from 'react';
import { Specimen } from '@/system/specimen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FormSection, SettingRow } from '.';

export default function FormSectionPreview() {
  const [name, setName] = useState('Relay Production (EU)');
  return (
    <>
      <Specimen label="Dirty" note="An edit shows the save bar; it stays in view until saved or discarded." stack>
        <FormSection title="Workspace" description="How this workspace is named across Relay." dirty onDiscard={() => setName('Relay Production')} onSave={() => {}}>
          <Field label="Name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        </FormSection>
      </Specimen>
      <Specimen label="Error" note="A failed save keeps the edit and says why, above the fields." stack>
        <FormSection title="Workspace" description="How this workspace is named across Relay." dirty error="The name is taken by another workspace in this organisation. Choose another." onSave={() => {}} onDiscard={() => {}}>
          <Field label="Name">{(p) => <Input {...p} defaultValue="Relay" />}</Field>
        </FormSection>
      </Specimen>
      <Specimen label="Read-only" note="Says who can change it, instead of disabling silently." stack>
        <FormSection title="Billing contact" readOnly="Only an owner can change billing. Ask Maya Chen.">
          <Field label="Email">{(p) => <Input {...p} defaultValue="finance@relay.dev" />}</Field>
        </FormSection>
      </Specimen>
      <Specimen label="Applies at once" note="No onSave: switches take effect immediately and the footnote says so." stack>
        <FormSection title="Notifications" description="What Relay emails you about." footnote="Changes apply at once.">
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
