'use client';

import { Specimen } from '@/system/specimen';
import { app } from '@/app.config';

const ROLES: { cls: string; spec: string; sample: React.ReactNode }[] = [
  { cls: 't-display', spec: 'text-display 52–104px · 600 · −0.035em · 0.96', sample: 'Every number, in place.' },
  { cls: 't-page', spec: 'text-page 36–56px · 600 · −0.035em · 1.02', sample: 'Overview' },
  { cls: 't-hero', spec: 'text-hero 52–80px · 600 · −0.035em', sample: <>2.9<span className="unit">M</span></> },
  { cls: 't-section', spec: 'text-xl 24–32px · 600 · −0.022em', sample: 'Busiest endpoints' },
  { cls: 't-figure', spec: 'text-2xl 32–42px · 600 · −0.03em', sample: <><span className="unit pre">$</span>298<span className="frac">.43</span></> },
  { cls: 't-card', spec: 'text-md 16px · 600 · −0.012em', sample: 'Requests per day' },
  { cls: 't-lead', spec: 'text-md 16px · 400 · ink-2 · 1.6', sample: 'Traffic, reliability and spend across every endpoint, for the period you choose.' },
  { cls: 't-body', spec: 'text-base 14px · 400 · 1.55', sample: 'Traffic shifted to eu-central-1 while eu-west-1 recovers. Latency is back under 650ms.' },
  { cls: 't-small', spec: 'text-sm 13px · 400 · 1.5', sample: 'About 98K a day. The busiest day was 1 Oct, with 128K.' },
  { cls: 't-caption', spec: 'text-xs 12px · ink-3 · 1.45', sample: 'Updated 4 min ago · UTC' },
  { cls: 't-kicker', spec: 'Geist Mono 11px · caps · 0.12em · ink-3, led by the slash', sample: `${app.name} · ${app.workspace}` },
  { cls: 't-eyebrow', spec: 'Geist Mono 11px · caps · 0.12em · ink-3', sample: 'Operate' },
  { cls: 't-mono', spec: 'Geist Mono 12px', sample: 'req_6a0x1fq3b2 · POST /v1/messages' },
  { cls: 't-num', spec: 'tabular, lining figures for columns', sample: '1,284,120 · 846,300 · 512,840' },
];

export default function TextRolesPreview() {
  return (
    <>
      {ROLES.map((r) => (
        <Specimen key={r.cls} label={`.${r.cls}`} note={r.spec}>
          <p className={`${r.cls} min-w-0 max-w-full`}>{r.sample}</p>
        </Specimen>
      ))}
      <Specimen label="Figures" note="The integer carries the reading; the currency, the cents and the unit step down to half size in ink-3.">
        <p className="t-hero t-num"><span className="unit pre">$</span>104,385<span className="frac">.25</span></p>
        <p className="t-figure t-num">0.90<span className="unit">%</span></p>
        <p className="t-figure t-num">294<span className="unit">ms</span></p>
      </Specimen>
    </>
  );
}
