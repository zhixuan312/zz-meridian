import type { UIMessage } from 'ai';
import { slug } from '@/app.config';

/** One thread per browser for the whole console; it goes nowhere but the assistant route. */
export const THREAD_KEY = `${slug}.assistant`;
const KEEP = 100;

/** Why a change that was never answered is closed. */
export const REASONS = {
  reload: 'The page was reloaded before anyone approved it.',
  movedOn: 'You moved on before approving it.',
} as const;

/** Every tool part still waiting for an answer becomes denied with the reason; nothing else changes. */
export function closeOpenApprovals(messages: UIMessage[], reason: string): UIMessage[] {
  return messages.map((m) =>
    m.parts.some((p) => (p as { state?: string }).state === 'approval-requested')
      ? {
          ...m,
          parts: m.parts.map((p) => {
            const part = p as unknown as { state?: string; approval?: { id: string } };
            return part.state === 'approval-requested'
              ? ({ ...p, state: 'output-denied', approval: { id: part.approval?.id, approved: false, reason } } as unknown as typeof p)
              : p;
          }),
        }
      : m,
  );
}

/** The stored thread, with waiting changes closed as expired; empty when missing, broken or from another version. */
export function loadThread(storage: Storage): UIMessage[] {
  try {
    const raw = storage.getItem(THREAD_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as { v?: number; messages?: unknown };
    if (stored.v !== 1 || !Array.isArray(stored.messages)) return [];
    return closeOpenApprovals((stored.messages as UIMessage[]).slice(-KEEP), REASONS.reload);
  } catch {
    return [];
  }
}

/** Keeps the last 100 messages; an empty thread removes the key; over the quota it keeps the newer half and tries once more. */
export function saveThread(storage: Storage, messages: UIMessage[]): void {
  try {
    if (messages.length === 0) return storage.removeItem(THREAD_KEY);
    const kept = messages.slice(-KEEP);
    try {
      storage.setItem(THREAD_KEY, JSON.stringify({ v: 1, messages: kept }));
    } catch {
      storage.setItem(THREAD_KEY, JSON.stringify({ v: 1, messages: kept.slice(Math.floor(kept.length / 2)) }));
    }
  } catch {
    // Storage is unavailable or still full: the thread stays in memory for this visit.
  }
}

export function clearThread(storage: Storage): void {
  try {
    storage.removeItem(THREAD_KEY);
  } catch {
    // Nothing stored that could be removed.
  }
}
