import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SECTIONS, entries, readRepo, stats } from '@/system/content';
import { Hero } from '@/system/hero';
import { Strata } from '@/system/strata';
import { demoSeries } from '@/system/fixtures/sample';

export const metadata = { title: { absolute: 'ZZ Meridian Design Atlas' } };

/** The front door: the thesis, the signature working, the layers, the surfaces and operators, the principles. */
export default function AtlasHome() {
  const s = stats();
  const readme = readRepo('README.md');
  const principles = [...(readme.split('## Principles')[1]?.split('\n## ')[0] ?? '').matchAll(/\*\*(.+?)\*\*\s*(.+)/g)].map((m) => ({ title: m[1].replace(/\.$/, ''), text: m[2] }));
  const all = entries();
  const latest = readRepo('CHANGELOG.md').split(/\n(?=## \[)/)[1] ?? '';
  const head = latest.match(/^## \[([^\]]+)\] · (\S+)\n+([^\n#][^\n]*)/);
  const release = { version: head?.[1] ?? s.version, date: head?.[2] ?? '', summary: head?.[3] ?? '', headlines: [...latest.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].replace(/[.:]$/, '').replace(/`/g, '')) };
  const changelog = all.find((e) => e.id === 'changelog')?.href;
  const series = demoSeries('30d').current;
  const counts = [
    [s.tokens, 'Tokens'], [s.components, 'Components'], [s.patterns, 'Patterns'], [s.pages, 'Pages'], [2, 'Themes'], [4, 'Accents'], [3, 'Surfaces'],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-[1320px] px-(--gutter) pb-24">
      {/* Thesis */}
      <section className="pt-16 lg:pt-24">
        <p className="t-kicker">ZZ Meridian design system · v{s.version}</p>
        <h1 className="t-display mt-8">
          One dashboard. <span className="max-md:block">Every surface.</span>
          <br />
          <span className="text-accent-ink">Both operators.</span>
        </h1>
        <div className="mt-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="t-lead text-pretty">
              Tokens, five layers of React components and a working template that hold at a desk, on a phone, and inside the conversation where an agent reads the dashboard with you.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/system/tokens/colour" className="press group inline-flex h-(--control-lg) items-center gap-2 rounded-lg bg-accent bg-(image:--accent-fill) px-5 text-base font-medium text-on-accent shadow-accent hover:brightness-[0.94]">
                Start with the tokens <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/" className="press inline-flex h-(--control-lg) items-center gap-2 rounded-lg border border-line-strong bg-surface/60 px-5 text-base font-medium shadow-control backdrop-blur-md hover:bg-surface">
                Open the template <ArrowRight className="size-[18px]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The signature, working */}
      <section aria-label="The Meridian, working" className="mt-14">
        <Hero series={series} />
        <p className="t-caption mt-4 text-center">The Meridian: point anywhere on the chart. The console, the phone and the chat all read the day you point at.</p>
      </section>

      {/* Counts */}
      <section aria-label="The system in numbers" className="mt-20 grid grid-cols-2 border-y border-line sm:grid-cols-4 lg:grid-cols-7">
        {counts.map(([n, l], i) => (
          <div key={l} className={'px-1 py-6 sm:px-5 ' + (i > 0 ? 'lg:border-l lg:border-line' : '')}>
            <p className="t-figure t-num">{n}</p>
            <p className="t-eyebrow mt-2">{l}</p>
          </div>
        ))}
      </section>

      {/* Layers */}
      <section className="mt-28">
        <SectionHead kicker="01" title={<>Five layers,<br />built from the bottom.</>} line="Each layer uses only the ones beneath it, so a change at the bottom moves everything above, and nothing above invents a value of its own." />
        <Strata sections={SECTIONS.filter((x) => x.num).map((x) => ({ ...x, count: all.filter((e) => e.section === x.id).length, href: all.find((e) => e.section === x.id)?.href ?? '/system' }))} />
      </section>

      {/* Surfaces and operators */}
      <section className="mt-28">
        <SectionHead kicker="02" title={<>Three surfaces.<br />Two operators.</>} line="People point, tap and type; agents call tools. Both use the same views, on the console, on a phone and in an MCP host, under five rules." />
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Addressable', 'Every view’s state is in its address: an agent opens exactly the view it means.'],
            ['Legible', 'Every view tells the model what is on screen, and again when it changes.'],
            ['Consent', 'An agent reads anything and changes nothing without a person’s Approve.'],
            ['Provenance', 'What an agent did keeps its name and the person it acted for.'],
            ['Handoff', 'Ask hands any card to the agent as a question, where one is listening.'],
          ].map(([t, d], i) => (
            <div key={t} className="bg-surface p-6">
              <p className="t-eyebrow">0{i + 1}</p>
              <p className="t-card mt-6">{t}</p>
              <p className="t-small mt-2 text-ink-2">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/system/start/surfaces" className="link inline-flex text-sm font-medium">Surfaces and inventory →</Link>
          <Link href="/system/pages/proposal" className="link inline-flex text-sm font-medium">See an agent’s proposal in a host →</Link>
        </div>
      </section>

      {/* Principles */}
      <section className="mt-28">
        <SectionHead kicker="03" title={<>The principles<br />every layer answers to.</>} line="When two choices both fit the specification, pick the one that serves these better." />
        <div className="grid border-t border-line md:grid-cols-2">
          {principles.map((p, i) => (
            <div key={p.title} className={'border-b border-line py-7 md:pr-10 ' + (i % 2 ? 'md:border-l md:pl-10' : '')}>
              <h3 className="t-card">{p.title}</h3>
              <p className="t-small mt-2.5 max-w-[56ch] text-ink-2">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section className="mt-28">
        <SectionHead kicker="04" title="Guides." line="How the surfaces work, how agents fit, and how to start a dashboard from this one." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {all.filter((e) => e.section === 'start' && e.id !== 'overview').map((e) => (
            <Link key={e.href} href={e.href} className="group flex flex-col rounded-lg border border-line bg-surface/70 p-5 hover:border-line-strong">
              <span className="t-card group-hover:text-accent-ink">{e.title}</span>
              <span className="t-small mt-2 line-clamp-3 text-ink-2">{e.summary}</span>
              <span className="t-eyebrow mt-auto pt-5">Read</span>
            </Link>
          ))}
        </div>
      </section>

      {/* What changed: the latest release in one line and its headlines; the whole log is one link away. */}
      <section className="mt-24">
        <SectionHead kicker="05" title="What changed." line="Every release, with what breaks and what to do instead." />
        <div className="grid gap-8 rounded-xl border border-line bg-surface p-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <p className="t-kicker">{release.version} · {release.date}</p>
            <p className="t-small mt-4 max-w-[48ch] text-ink-2">{release.summary}</p>
            {changelog ? (
              <Link href={changelog} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline">
                Full changelog <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
          <ul className="grid content-start gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {release.headlines.map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-sm text-ink"><span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-3" />{h}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-24 flex flex-wrap items-center gap-4 border-t border-line pt-8 text-xs text-ink-3">
        <span className="font-mono tracking-[0.08em] uppercase">Generated from this repository</span>
        <span className="ml-auto">ZZ Meridian · MIT</span>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title, line, compact }: { kicker: string; title: React.ReactNode; line: string; compact?: boolean }) {
  return (
    <div className={compact ? 'mb-6' : 'mb-10 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}>
      <div>
        <p className="t-kicker mb-5">{kicker}</p>
        <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.02] font-semibold tracking-[-0.03em]">{title}</h2>
      </div>
      <p className={'t-small max-w-[52ch] text-ink-2 ' + (compact ? 'mt-3' : 'lg:pb-1.5')}>{line}</p>
    </div>
  );
}
