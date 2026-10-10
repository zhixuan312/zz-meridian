import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const slug = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const text = (n: ReactNode): string => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' && 'props' in n ? text((n as { props: { children?: ReactNode } }).props.children) : '');

/** The h2 headings of a document, for "On this page". */
export function headings(md: string) {
  return [...md.matchAll(/^##\s+(.+)$/gm)].map((m) => ({ id: slug(m[1]), title: m[1].replace(/[`*]/g, '') }));
}

/** A specification or guide, set for reading: a 72-character measure, quiet tables, anchored headings. */
export function Doc({ md, className }: { md: string; className?: string }) {
  return (
    <div className={cn('doc min-w-0 text-base leading-[1.75] text-ink-2', className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const id = slug(text(children));
            return (
              <h2 id={id} className="group mt-14 mb-4 scroll-mt-24 border-t border-line pt-8 text-xl font-semibold tracking-[-0.02em] text-ink first:mt-0 first:border-0 first:pt-0">
                <a href={`#${id}`} className="no-underline">{children}<span className="ml-2 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">#</span></a>
              </h2>
            );
          },
          h3: ({ children }) => <h3 id={slug(text(children))} className="mt-9 mb-3 scroll-mt-24 text-md font-semibold tracking-[-0.01em] text-ink">{children}</h3>,
          p: ({ children }) => <p className="my-3.5 max-w-[72ch]">{children}</p>,
          ul: ({ children }) => <ul className="my-3.5 max-w-[72ch] list-disc space-y-1.5 pl-5 marker:text-ink-3">{children}</ul>,
          ol: ({ children }) => <ol className="my-3.5 max-w-[72ch] list-decimal space-y-1.5 pl-5 marker:text-ink-3">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          a: ({ href, children }) => <a href={href} className="link">{children}</a>,
          code: ({ children, className: c }) =>
            c ? <code className={c}>{children}</code> : <code className="t-code">{children}</code>,
          pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-lg border border-line bg-surface-sunk p-5 font-mono text-sm leading-relaxed text-ink [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-lg border border-line bg-surface/60">
              <table className="w-full min-w-[560px] text-left text-sm leading-normal">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-line bg-surface-sunk/70">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-2.5 font-mono text-2xs font-regular tracking-[0.1em] text-ink-3 uppercase">{children}</th>,
          tr: ({ children }) => <tr className="border-b border-line last:border-0">{children}</tr>,
          td: ({ children }) => <td className="px-4 py-3 align-top text-ink-2 [&_code]:whitespace-nowrap">{children}</td>,
          blockquote: ({ children }) => <blockquote className="my-5 border-l-2 border-accent pl-4 text-ink">{children}</blockquote>,
          hr: () => <hr className="my-10" />,
        }}
      >
        {md}
      </Markdown>
    </div>
  );
}
