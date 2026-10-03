import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Globe2, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { Brand } from "@/components/bharatkhoj/Brand";
import { Button } from "@/components/ui/button";

const schema = z.object({ url: z.string().catch(""), q: z.string().catch(""), title: z.string().catch("") });

export const Route = createFileRoute("/view")({
  validateSearch: schema,
  head: () => ({ meta: [
    { title: "Website viewer — BharatKhoj" },
    { name: "description", content: "View a search result within BharatKhoj." },
    { property: "og:title", content: "Website viewer — BharatKhoj" },
    { property: "og:description", content: "View a search result within BharatKhoj." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,follow" },
  ] }),
  component: WebsiteViewer,
});

function WebsiteViewer() {
  const { url, q, title } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  let safeUrl: string | null = null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") safeUrl = parsed.href;
  } catch { /* invalid address */ }
  const host = safeUrl ? new URL(safeUrl).hostname : "";

  return <div className="viewer-page">
    <header className="viewer-header">
      <Button variant="ghost" size="icon" asChild><Link to="/search" search={{ q, page: 1 }} aria-label="Back to search results"><ArrowLeft /></Link></Button>
      <Brand compact />
      {safeUrl && <div className="viewer-address" title={safeUrl}><Globe2 aria-hidden="true" /><span>{host}</span></div>}
      {safeUrl && <Button variant="outline" size="sm" asChild><a href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${host} in a new tab`}><ExternalLink /> <span className="viewer-open-label">Open original</span></a></Button>}
    </header>
    {safeUrl ? <>
      <div className="viewer-notice" role="status"><span>{title || host} · This website is independent of BharatKhoj. Some sites do not allow viewing inside another website; use “Open original” if it stays blank.</span></div>
      <main className="viewer-frame-wrap">
        {loading && <p className="viewer-loading">Opening {host}…</p>}
        <iframe key={safeUrl} className="viewer-frame" src={safeUrl} title={title || host} onLoad={() => setLoading(false)} referrerPolicy="no-referrer" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" />
      </main>
    </> : <main className="viewer-error"><ShieldAlert aria-hidden="true" /><h1>Website unavailable</h1><p>This link cannot be opened.</p><Button asChild><Link to="/">Back to BharatKhoj</Link></Button></main>}
  </div>;
}