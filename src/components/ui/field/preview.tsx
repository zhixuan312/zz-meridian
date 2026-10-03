'use client';

import { Specimen } from '@/system/specimen';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '.';

export default function FieldPreview() {
  return (
    <>
      <Specimen label="Label and hint" stack>
        <div className="grid w-full max-w-160 gap-5 sm:grid-cols-2">
          <Field label="Key name" hint="Shown in logs and the activity feed.">
            {(p) => <Input {...p} defaultValue="production-signing" />}
          </Field>
          <Field label="Region" hint="Where requests with this key are served.">
            {(p) => (
              <Select
                {...p}
                defaultValue="us-east-1"
                options={[
                  { value: 'us-east-1', label: 'us-east-1' },
                  { value: 'eu-west-1', label: 'eu-west-1' },
                  { value: 'ap-southeast-1', label: 'ap-southeast-1' },
                ]}
              />
            )}
          </Field>
        </div>
      </Specimen>
      <Specimen label="Required" note="Mark required fields, or optional ones: one convention per form." stack>
        <div className="grid w-full max-w-160 gap-5 sm:grid-cols-2">
          <Field label="Webhook URL" required hint="Must start with https://.">
            {(p) => <Input {...p} placeholder="https://" />}
          </Field>
          <Field label="Description" optional>
            {(p) => <Input {...p} placeholder="What this endpoint receives" />}
          </Field>
        </div>
      </Specimen>
      <Specimen label="Error" note="Replaces the hint; announced when it appears." stack>
        <div className="grid w-full max-w-160 gap-5 sm:grid-cols-2">
          <Field label="Rate limit" error="Enter a whole number between 10 and 10,000." hint="Requests per minute.">
            {(p) => <Input {...p} defaultValue="2,000.5" trailing={<span className="text-xs">rpm</span>} />}
          </Field>
          <Field label="Signing secret" action={<button type="button" className="link font-medium">Generate</button>} hint="At least 32 characters.">
            {(p) => <Input {...p} type="password" defaultValue="relay-signing-secret-0042" />}
          </Field>
        </div>
      </Specimen>
      <Specimen label="With a textarea" stack>
        <Field label="Note for the next on-call" hint="Markdown is not rendered here." className="w-full max-w-160">
          {(p) => <Textarea {...p} rows={3} placeholder="What changed, and why" />}
        </Field>
      </Specimen>
    </>
  );
}
