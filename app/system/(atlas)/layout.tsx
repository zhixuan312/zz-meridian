import { SECTIONS, entries } from '@/system/content';
import { AtlasShell, type AtlasNav } from '@/system/atlas-shell';

export const metadata = { title: { default: 'ZZ Meridian Design Atlas', template: '%s · ZZ Meridian Design Atlas' } };

/** The Design Atlas: the reading view of this repository. Every entry is read from the repository at build time. */
export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  const all = entries();
  const nav: AtlasNav = SECTIONS.map((s) => ({
    ...s,
    items: all.filter((e) => e.section === s.id).map((e) => ({ href: e.href, title: e.title, status: e.status, kind: e.kind })),
  }));
  return <AtlasShell nav={nav}>{children}</AtlasShell>;
}
