'use client';

import type { UIMessage } from 'ai';
import { Specimen, State } from '@/system/specimen';
import { AssistantLauncher, AssistantPanel } from '.';

const say = (id: string, role: 'user' | 'assistant', text: string): UIMessage => ({ id, role, parts: [{ type: 'text', text }] });

const thread = [
  say('1', 'user', 'Why did p95 latency rise on Tuesday?'),
  say('2', 'assistant', 'Latency rose from 212 ms to 340 ms between 08:00 and 09:30 UTC, while Parallax AI ran its batch job. Error rate stayed at 0.2%.'),
];

const noop = () => {};

export default function AssistantPreview() {
  return (
    <>
      <Specimen label="Launcher" note="In the top bar beside search and alerts. Closed: the panel is not in the page and takes no width.">
        <State label="Closed"><AssistantLauncher open={false} onClick={noop} /></State>
        <State label="Open"><AssistantLauncher open onClick={noop} /></State>
      </Specimen>
      <Specimen label="Panel" note="From 1024px a third column at the assistant width; below it the same panel is a sheet over the page." className="items-start">
        <State label="Empty"><AssistantPanel inline messages={[]} onSend={noop} onClose={noop} className="h-120 rounded-lg border" /></State>
        <State label="A short thread"><AssistantPanel inline messages={thread} onSend={noop} onClose={noop} className="h-120 rounded-lg border" /></State>
        <State label="Waiting for the answer"><AssistantPanel inline busy messages={thread.slice(0, 1)} onSend={noop} onClose={noop} className="h-120 rounded-lg border" /></State>
      </Specimen>
    </>
  );
}
