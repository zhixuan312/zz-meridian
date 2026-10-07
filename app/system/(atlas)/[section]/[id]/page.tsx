import { notFound } from 'next/navigation';
import { entries, entry, PAGES } from '@/system/content';
import { CardStage } from '@/system/card-stage';
import { PageStage } from '@/system/page-stage';
import { TokenView } from '@/system/token-view';
import { tokenGroups } from '@/system/tokens-data';
import { Article } from '../../_article';
import { contextText } from '@/lib/shared-context';
import { healthTool, overviewTool, requestsTool } from '@/views/tools';

/** The tool behind each embed view, so the host simulator shows the result an MCP server would return for it. */
const TOOLS = { '/embed/overview': overviewTool, '/embed/requests': requestsTool, '/embed/health': healthTool } as const;

/**
 * What an MCP server returns for the view's tool (`docs/agents.md`), slimmed for the page: `content` is the context's
 * text, `structuredContent` the view's data (its keys shown here), `_meta.ui.resourceUri` the view to render.
 */
async function toolResultOf(embed?: string) {
  const tool = embed ? TOOLS[embed as keyof typeof TOOLS] : undefined;
  if (!tool) return undefined;
  const { context, data } = await tool.read({});
  return { name: tool.name, text: contextText(context), resourceUri: tool.resourceUri, structured: Object.keys(data) };
}

/** Cards, pages and the token views: the entries that put something on the stage. The guides read from their own routes. */
const STAGED = ['card', 'page', 'tokens'];

export function generateStaticParams() {
  return entries().filter((e) => STAGED.includes(e.kind)).map((e) => ({ section: e.section, id: e.id }));
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
  const page = PAGES.find((p) => p.id === e.id);
  const stage =
    e.kind === 'card' ? <CardStage id={`${e.section}/${e.id}`} />
    : e.kind === 'page' && page ? <PageStage route={page.route} embed={page.embed} title={page.title} toolResult={await toolResultOf(page.embed)} />
    : e.kind === 'tokens' ? <TokenView view={e.id} groups={tokenGroups()} />
    : null;
  return <Article e={e} stage={stage} />;
}
