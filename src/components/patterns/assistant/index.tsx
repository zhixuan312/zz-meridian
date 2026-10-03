'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { ArrowUp, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AgentMark } from '@/components/ui/agent-mark';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Textarea } from '@/components/ui/textarea';
import type { PageContext } from '@/lib/assistant/prompt';

/** Reads the page from the scroll region: the masthead title and the visible text. */
export function readPage(path: string): PageContext {
  const region = document.querySelector<HTMLElement>('[data-scroll-region]');
  return { path, title: region?.querySelector('h1')?.textContent ?? '', text: region?.innerText ?? '' };
}

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');

/** The top-bar button that opens and closes the panel. */
export function AssistantLauncher({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Assistant"
      aria-expanded={open}
      title="Assistant"
      className="press hit grid size-9 place-items-center rounded-full border border-line-strong bg-surface/60 shadow-control backdrop-blur-md hover:border-line-control/40 data-[open=true]:bg-surface-sunk"
      data-open={open}
    >
      <AgentMark size="sm" />
    </button>
  );
}

/**
 * The panel, drawn from its messages alone: a third column of the shell from 1024px, a sheet over the page below it.
 * Both come from CSS; nothing here measures the window.
 */
export function AssistantPanel({
  messages,
  busy = false,
  onSend,
  onClose,
  inline,
  className,
}: {
  messages: UIMessage[];
  busy?: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
  /** Draw in the flow instead of fixed to the viewport edge: for previews. */
  inline?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState('');
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const text = draft.trim();
  const send = () => {
    if (!text || busy) return;
    onSend(text);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <aside
      data-assistant
      aria-label="Assistant"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className={cn(
        'flex h-full min-h-0 flex-col border-l border-line bg-frame backdrop-blur-xl backdrop-saturate-150',
        inline
          ? 'w-(--assistant-width) max-w-full'
          : 'fixed inset-y-0 right-0 z-(--layer-overlay) w-(--assistant-width) max-w-[calc(100vw-48px)] bg-ground shadow-overlay lg:relative lg:z-auto lg:shrink-0 lg:bg-frame lg:shadow-none',
        className,
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <AgentMark size="md" />
        <h2 className="t-section min-w-0 flex-1 truncate">Assistant</h2>
        <IconButton label="Close assistant" icon={<X />} onClick={onClose} className="-mr-2" />
      </div>
      <div ref={thread} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.length === 0 ? (
          <p className="t-small m-auto max-w-[32ch] text-center text-ink-3">Ask about this page: what a figure means, or why it moved.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} data-role={m.role} className={cn('flex min-w-0 flex-col gap-1', m.role === 'user' && 'items-end')}>
              {m.role === 'assistant' ? <span className="t-caption">Claude</span> : null}
              <p className={cn('t-small max-w-full whitespace-pre-wrap [overflow-wrap:anywhere]', m.role === 'user' ? 'rounded-lg bg-fill-hover px-3 py-2 text-ink' : 'text-ink-2')}>{textOf(m)}</p>
            </div>
          ))
        )}
      </div>
      <form
        className="flex shrink-0 items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Textarea
          aria-label="Message"
          placeholder="Ask about this page"
          rows={1}
          maxRows={6}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        <Button type="submit" variant="primary" icon={<ArrowUp />} aria-label="Send" disabled={!text || busy} className="w-(--control-md) px-0" />
      </form>
    </aside>
  );
}

/**
 * The assistant's state: the conversation and whether the panel is open. It lives in the shell, so it survives
 * navigation. The panel itself is not in the page while closed.
 */
export function AssistantColumn({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/assistant', body: () => ({ page: readPage(pathRef.current) }) }),
    [],
  );
  const { messages, sendMessage, status } = useChat({ transport });
  if (!open) return null;
  return <AssistantPanel messages={messages} busy={status === 'submitted' || status === 'streaming'} onSend={(text) => sendMessage({ text })} onClose={onClose} />;
}
