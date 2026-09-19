import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, LoaderCircle, SearchX, Settings2, WifiOff } from "lucide-react";
import { z } from "zod";
import { AdSlot } from "@/components/bharatkhoj/AdSlot";
import { Brand } from "@/components/bharatkhoj/Brand";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";
import { Button } from "@/components/ui/button";
import type { SearchResponse } from "@/lib/search.types";

const searchSchema = z.object({ q: z.string().catch(""), page: z.coerce.number().int().min(1).catch(1) });
export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: ({ search }) => {
    const q = typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
    const title = q ? `${q} — BharatKhoj Search` : "Search — BharatKhoj";
    const description = q ? `Search results for ${q} on BharatKhoj.` : "Search the web with BharatKhoj, India First Search Engine.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { property: "og:url", content: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }, { name: "twitter:card", content: "summary" }, ...(q ? [{ name: "robots", content: "noindex,follow" }] : [])], links: [{ rel: "canonical", href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }] };
  },
  component: SearchPage,
});

async function fetchResults(query: string, page: number): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=10`);
  const payload = await response.json() as SearchResponse & { message?: string };
  if (!response.ok) throw new Error(payload.message || (response.status === 429 ? "Too many searches. Please try again shortly." : "Search is temporarily unavailable."));
  return payload;
}
function SearchPage() {
  const { q, page } = Route.useSearch();
  const query = q.trim().slice(0, 200);
  const resultQuery = useQuery({ queryKey: ["search", query, page], queryFn: () => fetchResults(query, page), enabled: query.length > 0, staleTime: 30_000, retry: 1 });
  return (
    <div className="results-page">
      <header className="results-header">
        <div className="results-header-row">
          <Brand compact />
          <SearchBox initialQuery={query} compact />
          <Button variant="ghost" size="icon" asChild><Link to="/settings" aria-label="Search settings"><Settings2 /></Link></Button>
        </div>
        <nav className="result-tabs" aria-label="Search categories"><span className="active">All</span><span>Images</span><span>News</span><span>Videos</span></nav>
      </header>
      <main className="results-main">
        <section className="results-column" aria-live="polite">
          {!query && <State icon={<SearchX />} title="Start your BharatKhoj search" text="Enter a topic, question, or website in the search field above." />}
          {resultQuery.isLoading && <State icon={<LoaderCircle className="animate-spin" />} title="Searching BharatKhoj" text="Finding the most relevant results…" />}
          {resultQuery.isError && <State icon={<WifiOff />} title="Search service unavailable" text={resultQuery.error.message} action={<Button onClick={() => resultQuery.refetch()}>Try again</Button>} />}
          {resultQuery.data?.status === "unconfigured" && <State icon={<AlertCircle />} title="Search service is not configured yet" text="BharatKhoj is ready to connect to a licensed web-search provider or its own index. No simulated results are shown." />}
          {resultQuery.data?.status === "ok" && (
            <>
              <p className="result-stats">{typeof resultQuery.data.total === "number" ? `About ${resultQuery.data.total.toLocaleString("en-IN")} results` : `${resultQuery.data.results.length} results`} ({(resultQuery.data.elapsedMs / 1000).toFixed(2)} seconds)</p>
              {resultQuery.data.results.length === 0 ? <State icon={<SearchX />} title="No results found" text={`We couldn't find results for “${query}”. Check the spelling or try a broader search.`} /> : (
                <ol className="result-list">{resultQuery.data.results.map((result) => <li key={result.url}>
                  <div className="result-source">{result.favicon && <img src={result.favicon} alt="" loading="lazy" referrerPolicy="no-referrer" />}<span>{result.source || result.displayUrl}</span></div>
                  <a href={result.url} target="_blank" rel="noopener noreferrer"><h2>{result.title}<ExternalLink aria-hidden="true" /></h2></a>
                  <p>{result.snippet}</p>{result.publishedDate && <time>{result.publishedDate}</time>}
                </li>)}</ol>
              )}
              {resultQuery.data.relatedSearches.length > 0 && <section className="related"><h2>Related searches</h2><div>{resultQuery.data.relatedSearches.map((item) => <Link key={item} to="/search" search={{ q: item, page: 1 }}>{item}</Link>)}</div></section>}
              {resultQuery.data.results.length > 0 && <nav className="pagination" aria-label="Search result pages"><Button variant="outline" disabled={page <= 1} asChild={page > 1}><Link to="/search" search={{ q: query, page: page - 1 }}>Previous</Link></Button><span>Page {page}</span><Button disabled={!resultQuery.data.hasMore} asChild={resultQuery.data.hasMore}><Link to="/search" search={{ q: query, page: page + 1 }}>Next</Link></Button></nav>}
            </>
          )}
        </section>
        <aside className="results-side"><AdSlot position="results" /><div className="search-note"><strong>BharatKhoj</strong><p>India First Search Engine</p><span>Real results only. No simulated web listings.</span></div></aside>
      </main>
      <SiteFooter />
    </div>
  );
}
function State({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) { return <div className="result-state">{icon}<h2>{title}</h2><p>{text}</p>{action}</div>; }
