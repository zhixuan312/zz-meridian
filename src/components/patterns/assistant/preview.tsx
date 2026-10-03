'use client';

import type { UIMessage } from 'ai';
import { Specimen, State } from '@/system/specimen';
import { AssistantLauncher, AssistantPanel } from '.';

const say = (id: string, role: 'user' | 'assistant', text: string): UIMessage => ({ id, role, parts: [{ type: 'text', text }] });

const asked = (id: string, text: string, title: string): UIMessage => ({ ...say(id, 'user', text), metadata: { page: { path: '/', title } } });

const thread = [
  asked('1', 'Why did p95 latency rise on Tuesday?', 'Overview'),
  say('2', 'assistant', 'Latency rose from 212 ms to 340 ms between 08:00 and 09:30 UTC, while Parallax AI ran its batch job. Error rate stayed at 0.2%.'),
];

const noop = () => {};

const change = { title: 'Change 2 members', tone: 'neutral', changes: [{ label: 'Alice Moreno', from: 'Active', to: 'Suspended' }, { label: 'Ravi Patel', from: 'Active', to: 'Suspended' }] };
const removal = { title: 'Remove Alice Moreno', tone: 'critical', changes: [{ label: 'Alice Moreno', from: 'Members', to: 'Removed' }] };

/** A turn proposing a change, with its tool part in the given state. */
const proposing = (name: string, preview: object, tool: Record<string, unknown>): UIMessage[] => [
  asked('u', 'Make that change.', 'Members'),
  { id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'Here is the change. Nothing happens until you approve it.' }, { type: 'data-proposal', id: 'c', data: preview }, { type: `tool-${name}`, toolCallId: 'c', input: {}, ...tool }] } as UIMessage,
];

export default function AssistantPreview() {
  return (
    <>
      <Specimen label="Launcher" note="In the top bar beside search and alerts. Closed: the panel is not in the page and takes no width.">
        <State label="Closed"><AssistantLauncher open={false} onClick={noop} /></State>
        <State label="Open"><AssistantLauncher open onClick={noop} /></State>
      </Specimen>
      <Specimen label="Panel" note="From 1024px a third column at the assistant width; below it the same panel is a sheet over the page." className="items-start">
        <State label="Empty"><AssistantPanel inline messages={[]} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="A short thread"><AssistantPanel inline messages={thread} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="Across pages"><AssistantPanel inline messages={[...thread, asked('3', 'Which keys are unused?', 'API keys'), say('4', 'assistant', 'Two keys have not been used in 30 days.')]} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="Error"><AssistantPanel inline messages={thread.slice(0, 1)} error="The assistant could not reach its provider. Try again." onRetry={noop} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="Waiting for the answer"><AssistantPanel inline busy messages={thread.slice(0, 1)} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
      </Specimen>
      <Specimen label="Changes" note="Every mutation arrives as a Proposal from the server's preview; only a waiting one shows buttons. A removal is critical. A change closed without an answer expires, with its reason." className="items-start">
        <State label="Waiting"><AssistantPanel inline messages={proposing('update_members', change, { state: 'approval-requested', approval: { id: 'x' } })} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="Waiting, a removal"><AssistantPanel inline messages={proposing('remove_members', removal, { state: 'approval-requested', approval: { id: 'x' } })} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="Applied"><AssistantPanel inline messages={proposing('update_members', change, { state: 'output-available', output: [], approval: { id: 'x', approved: true } })} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
        <State label="Expired"><AssistantPanel inline messages={proposing('remove_members', removal, { state: 'output-denied', approval: { id: 'x', approved: false, reason: 'The page was reloaded before anyone approved it.' } })} onSend={noop} onClose={noop} onDecide={noop} onClear={noop} className="h-120 rounded-lg border" /></State>
      </Specimen>
    </>
  );
}
