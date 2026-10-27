import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SECTIONS, entries, readRepo, stats } from '@/system/content';
import { Hero } from '@/system/hero';
import { Strata } from '@/system/strata';
import { demoSeries } from '@/system/fixtures/company';

export const metadata = { title: { absolute: 'ZZ Meridian Design Atlas' } };

/** The front door: the thesis, the signature working, the layers, the surfaces and operators, the principles. */
export default function AtlasHome() {
  const s = stats();
  const readme = readRepo('README.md');
  const principles = [...(readme.split('## Principles')[1]?.split('\n## ')[0] ?? '').matchAll(/\*\*(.+?)\*\*\s*(.+)/g)].map((m) => ({ title: m[1].replace(/\.$/, ''), text: m[2] }));
  const all = entries();
  // The front page states the latest *release*, not the work toward the next one. `[Unreleased]` is a section like any
  // other and it sits first, and reading it here named pending work with the version it is going to be released
  // under, without a date and without its summary — the entry is written for the day it becomes `## [x.y.z] · date`.
  const latest = readRepo('CHANGELOG.md').split(/\n(?=## \[)/).slice(1).find((s) => /^## \[\d+\.\d+\.\d+\] · \S+/.test(s)) ?? '';
  // The version and its date are on the heading, and the summary is the paragraph under it — a line every one of these
  // releases does without, since they all open on a `###` heading, but the card has the place for one. Read together as
  // they were, `[^\n#]` refused the `#` of `### Breaking`, so the newest release lost its date to the fallback and the
  // card printed a separator with nothing after it.
  const heading = latest.match(/^## \[([^\]]+)\] · (\S+)/);
  const summary = latest.split(/\n\n/).slice(1).map((p) => p.trim()).find((p) => p && !p.startsWith('#') && !p.startsWith('-') && !p.startsWith('|')) ?? '';
  const release = { version: heading?.[1] ?? s.version, date: heading?.[2] ?? '', summary, headlines: [...latest.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].replace(/[.:]$/, '').replace(/`/g, '')) };
  const changelog = all.find((e) => e.id === 'changelog')?.href;
  const series = demoSeries('30d').current;
  const counts = [
    [s.tokens, 'Tokens'], [s.components, 'Components'], [s.patterns, 'Patterns'], [s.templates, 'Templates'], [s.pages, 'Pages'], [2, 'Themes'], [4, 'Accents'], [3, 'Surfaces'],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-[1320px] px-(--gutter) pb-24">
      {/* Thesis */}
      <section className="pt-16 lg:pt-24">
        <p className="t-kicker">ZZ Meridian design system · v{s.version}</p>
        <h1 className="t-display mt-8">
          One dashboard. <span className="max-md:block">Every surface.</span>
          <br className="max-md:hidden" />
          <span className="block text-accent-ink md:inline">Both operators.</span>
        </h1>
        <div className="mt-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="t-lead text-pretty">
              Tokens, components, patterns, pages and a product’s workspaces, in a working template that holds at a desk, on a phone, and inside the conversation where an agent reads the dashboard with you.
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
      {/* Eight columns only where the numbers and their labels fit them: at 1024 with the rail, eight cells were 49px wide
          and five labels ran past the cell's edge and its neighbour's padding. Four until xl, and a rule only at the start
          of a row, whichever count is in that row. */}
      <section aria-label="The system in numbers" className="mt-20 grid grid-cols-2 border-y border-line sm:grid-cols-4 xl:grid-cols-8">
        {counts.map(([n, l], i) => (
          <div key={l} className={'border-line px-1 py-6 sm:px-5 ' + (i % 2 ? 'border-l ' : '') + (i % 4 === 0 ? 'sm:border-l-0 ' : 'sm:border-l ') + (i > 0 ? 'xl:border-l' : 'xl:border-l-0')}>
            <p className="t-figure t-num">{n}</p>
            <p className="t-eyebrow mt-2">{l}</p>
          </div>
        ))}
      </section>

      {/* Layers */}
      <section className="mt-28">
        <SectionHead title={<>Six layers,<br />built from the bottom.</>} line="Each layer uses only the ones beneath it, so a change at the bottom moves everything above, and nothing above invents a value of its own." />
        <Strata sections={SECTIONS.filter((x) => x.num).map((x) => ({ ...x, count: all.filter((e) => e.section === x.id).length, href: all.find((e) => e.section === x.id)?.href ?? '/system' }))} />
      </section>

      {/* Surfaces and operators */}
      <section className="mt-28">
        <SectionHead title={<>Three surfaces.<br />Two operators.</>} line="People point, tap and type; agents call tools. Both use the same views, on the console, on a phone and in an MCP host, under five rules." />
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
          <Link href="/system/start/surfaces" className="link inline-flex items-center gap-1.5 text-sm font-medium">Surfaces and inventory <ArrowRight className="size-3.5" /></Link>
          <Link href="/system/pages/proposal" className="link inline-flex items-center gap-1.5 text-sm font-medium">See an agent’s proposal in a host <ArrowRight className="size-3.5" /></Link>
        </div>
      </section>

      {/* Principles */}
      <section className="mt-28">
        <SectionHead title={<>The principles<br />every layer answers to.</>} line="When two choices both fit the specification, pick the one that serves these better." />
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
        <SectionHead title="Guides." line="How the surfaces work, how agents fit, and how to start a dashboard from this one." />
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
        <SectionHead title="What changed." line="Every release, with what breaks and what to do instead." />
        <div className="grid gap-8 rounded-xl border border-line bg-surface p-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            {/* A release is named and dated, always; the paragraph under it is a release's own to have. */}
            <p className="t-kicker">{release.date ? `${release.version} · ${release.date}` : release.version}</p>
            {release.summary ? <p className="t-small mt-4 max-w-[48ch] text-ink-2">{release.summary}</p> : null}
            {/* The link takes its own line: the kicker above it is `inline-flex`, so an inline link shares its line and
                reads as one word, which is what it did once the empty summary paragraph between them went. */}
            {changelog ? (
              <Link href={changelog} className="mt-6 flex w-fit items-center gap-1.5 text-sm font-medium text-accent-ink hover:text-ink">
                Full changelog <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
          {/* A digest, not the section: four headlines, and the rest one link away. Every headline used to be in this
              page's HTML, so the page grew with the length of a release — 0.29.0's ten took it 5.8% over its HTML
              baseline, which is a page whose size the changelog decides. The cap keeps the page's size its own. */}
          <ul className="grid content-start gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {release.headlines.slice(0, 4).map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-sm text-ink"><span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-3" />{h}</li>
            ))}
            {release.headlines.length > 4 ? (
              <li className="flex items-center gap-2.5 text-sm text-ink-3"><span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-3" />and {release.headlines.length - 4} more in the changelog</li>
            ) : null}
          </ul>
        </div>
      </section>

      <footer className="mt-24 flex flex-wrap items-center gap-4 border-t border-line pt-8 text-xs text-ink-3">
        <span className="font-medium">Generated from this repository</span>
        <span className="ml-auto">ZZ Meridian · MIT</span>
      </footer>
    </div>
  );
}

function SectionHead({ title, line, compact }: { title: React.ReactNode; line: string; compact?: boolean }) {
  return (
    <div className={compact ? 'mb-6' : 'mb-10 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}>
      <div>
        {/* No number above it: the headline names the section, and a counter would only be decoration. */}
        <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.02] font-semibold tracking-[-0.03em]">{title}</h2>
      </div>
      <p className={'t-small max-w-[52ch] text-ink-2 ' + (compact ? 'mt-3' : 'lg:pb-1.5')}>{line}</p>
    </div>
  );
}
