import { EmbedSurface } from '@/components/base/surface';

/**
 * MCP App views. Each route is a `ui://` resource's document: an MCP server serves it (or its built HTML) as
 * `text/html;profile=mcp-app` and names it in a tool's `_meta.ui.resourceUri`. No shell: the host frames it.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <EmbedSurface>{children}</EmbedSurface>;
}
