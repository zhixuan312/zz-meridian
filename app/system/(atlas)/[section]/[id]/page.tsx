import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SECTIONS, entries, entry, specOf, PAGES } from '@/system/content';
import { Doc, headings } from '@/system/markdown';
import { CardStage } from '@/system/card-stage';
import { PageStage } from '@/system/page-stage';
import { TokenView } from '@/system/token-view';
import { tokenGroups } from '@/system/tokens-data';
import { Badge } from '@/components/ui/badge';

export function generateStaticParams() {
  return entries().map((e) => ({ section: e.section, id: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  const e = entry(section, id);
  return { title: e?.title ?? 'Not found', description: e?.summary };
}

export default async function EntryPage({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  const e = entry(section, id);
  if (!e) notFound();
  const sec = SECTIONS.find((s) => s.id === e.section)!;
  const spec = e.kind === 'tokens' ? null : specOf(e);
  const toc = spec ? headings(spec.body) : [];
  const all = entries();
  const i = all.findIndex((x) => x.href === e.href);
  const prev = all[i - 1], next = all[i + 1];
  const page = PAGES.find((p) => p.id === e.id);

  return (
    <article className="mx-auto w-full max-w-[1240px] px-(--gutter) pt-10 pb-24 lg:pt-14">
      <header className="max-w-[60rem]">
        <p className="t-kicker">{sec.num ? `Layer ${sec.num} · ${sec.title}` : sec.title}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="t-page">{e.title}</h1>
          {e.status ? <Badge tone={e.status === 'stable' ? 'positive' : e.status === 'beta' ? 'accent' : 'warning'} dot className="mt-2">{e.status}</Badge> : null}
        </div>
        {(spec?.lead || e.summary) ? <p className="t-lead mt-4 max-w-[62ch] text-pretty">{spec?.lead || e.summary}</p> : null}
        <p className="t-mono mt-4 text-ink-3">{e.source}</p>
      </header>

      {e.kind === 'card' ? <div className="mt-10"><CardStage id={`${e.section}/${e.id}`} /></div> : null}
      {e.kind === 'page' && page ? <div className="mt-10"><PageStage route={page.route} embed={page.embed} title={page.title} /></div> : null}
      {e.kind === 'tokens' ? <div className="mt-10"><TokenView view={e.id} groups={tokenGroups()} /></div> : null}

      {spec ? (
        <div className="mt-14 grid gap-12 xl:grid-cols-[minmax(0,1fr)_13rem]">
          <Doc md={spec.body} />
          {toc.length > 2 ? (
            <nav aria-label="On this page" className="sticky top-8 hidden self-start xl:block">
              <p className="t-eyebrow mb-3">On this page</p>
              <ul className="space-y-1.5 border-l border-line">
                {toc.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-sm text-ink-3 hover:border-ink-3 hover:text-ink">{h.title}</a></li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      ) : null}

      <nav aria-label="Next and previous" className="mt-20 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
        {prev ? (
          <Link href={prev.href} className="group rounded-lg border border-line bg-surface/50 p-5 hover:border-line-strong">
            <span className="t-eyebrow flex items-center gap-1.5"><ArrowLeft className="size-3" />Previous</span>
            <span className="mt-2 block font-semibold group-hover:text-accent-ink">{prev.title}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={next.href} className="group rounded-lg border border-line bg-surface/50 p-5 text-right hover:border-line-strong">
            <span className="t-eyebrow flex items-center justify-end gap-1.5">Next<ArrowRight className="size-3" /></span>
            <span className="mt-2 block font-semibold group-hover:text-accent-ink">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
