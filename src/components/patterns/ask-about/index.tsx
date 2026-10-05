'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSurface } from '@/components/base/surface';
import { Tooltip } from '@/components/ui/tooltip';

/**
 * Hand a card to the agent: one press posts a question about exactly what the card shows into the conversation.
 * It exists only where an agent is listening (an MCP host); on the console it renders nothing, so no dead control
 * is ever shown. The question is written for the person to read in the thread, so it names the card's facts.
 */
export function AskAbout({ question, className }: { question: string; className?: string }) {
  const { ask } = useSurface();
  if (!ask) return null;
  return (
    <Tooltip content="Ask the assistant about this">
      <button
        type="button"
        onClick={() => ask(question)}
        aria-label={`Ask: ${question}`}
        className={cn('press hit inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-accent-ink hover:bg-accent-tint', className)}
      >
        <Sparkles className="size-3.5" /> Ask
      </button>
    </Tooltip>
  );
}
