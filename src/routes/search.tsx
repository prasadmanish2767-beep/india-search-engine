import { useMemo, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, LoaderCircle, SearchX, Settings2, WifiOff } from "lucide-react";
import { z } from "zod";
import { AdSlot } from "@/components/bharatkhoj/AdSlot";
import { Brand } from "@/components/bharatkhoj/Brand";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";
import { Button } from "@/components/ui/button";
import { buildRelated } from "@/lib/suggest";
import { applyFilters, LANG_OPTIONS, TIME_OPTIONS, TYPE_OPTIONS, type LangFilter, type TimeFilter, type TypeFilter } from "@/lib/filters";
import type { SearchResponse } from "@/lib/search.types";

const searchSchema = z.object({
  q: z.string().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  time: z.string().catch("any"),
  lang: z.string().catch("any"),
  type: z.string().catch("all"),
});
export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: (ctx) => {
    const search = (ctx as { search?: { q?: unknown } }).search;
    const q = typeof search?.q === "string" ? search.q.trim().slice(0, 200) : "";
    const title = q ? `${q} — BharatKhoj Search` : "Search — BharatKhoj";
    const description = q ? `Search results for ${q} on BharatKhoj.` : "Search the web with BharatKhoj, India First Search Engine.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { property: "og:url", content: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }, { name: "twitter:card", content: "summary" }, ...(q ? [{ name: "robots", content: "noindex,follow" }] : [])], links: [{ rel: "canonical", href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }] };
  },
  component: SearchPage,
});

async function fetchResults(query: string, page: number, fresh: boolean): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=10${fresh ? "&fresh=1" : ""}`);
  const payload = await response.json() as SearchResponse & { message?: string };
  if (!response.ok) throw new Error(payload.message || (response.status === 429 ? "Too many searches. Please try again shortly." : "Search is temporarily unavailable."));
  return payload;
}
function SearchPage() {
  const { q, page, time, lang, type } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const query = q.trim().slice(0, 200);
  const freshRef = useRef(false);
  const resultQuery = useQuery({ queryKey: ["search", query, page], queryFn: () => { const fresh = freshRef.current; freshRef.current = false; return fetchResults(query, page, fresh); }, enabled: query.length > 0, staleTime: 30_000, retry: 0 });
  const checkAgain = () => { freshRef.current = true; resultQuery.refetch(); };
  const timeFilter = (TIME_OPTIONS.some((o) => o.value === time) ? time : "any") as TimeFilter;
  const langFilter = (LANG_OPTIONS.some((o) => o.value === lang) ? lang : "any") as LangFilter;
  const typeFilter = (TYPE_OPTIONS.some((o) => o.value === type) ? type : "all") as TypeFilter;
  const filtersActive = timeFilter !== "any" || langFilter !== "any" || typeFilter !== "all";
  const allResults = resultQuery.data?.status === "ok" ? resultQuery.data.results : [];
  const visibleResults = useMemo(() => applyFilters(allResults, { time: timeFilter, lang: langFilter, type: typeFilter }), [allResults, timeFilter, langFilter, typeFilter]);
  const setFilter = (patch: Partial<{ time: string; lang: string; type: string }>) => { void navigate({ search: (prev) => ({ ...prev, ...patch }) }); };
  const clearFilters = () => setFilter({ time: "any", lang: "any", type: "all" });
  return (
    <div className="results-page">
      <header className="results-header">
        <div className="results-header-row">
          <Brand compact />
          <SearchBox initialQuery={query} compact />
          <Button variant="ghost" size="icon" asChild><Link to="/settings" aria-label="Search settings"><Settings2 /></Link></Button>
        </div>
        <nav className="result-tabs" aria-label="Search categories"><span className="active">All</span><span>Images</span><span>News</span><span>Videos</span></nav>
        {resultQuery.data?.status === "ok" && allResults.length > 0 && (
          <div className="result-filters" role="group" aria-label="Refine results">
            <FilterSelect label="Time" value={timeFilter} options={TIME_OPTIONS} onChange={(value) => setFilter({ time: value })} />
            <FilterSelect label="Language" value={langFilter} options={LANG_OPTIONS} onChange={(value) => setFilter({ lang: value })} />
            <FilterSelect label="Result type" value={typeFilter} options={TYPE_OPTIONS} onChange={(value) => setFilter({ type: value })} />
            {filtersActive && <button type="button" className="filter-clear" onClick={clearFilters}>Clear filters</button>}
          </div>
        )}
      </header>
      <main className="results-main">
        <section className="results-column" aria-live="polite">
          {!query && <State icon={<SearchX />} title="Start your BharatKhoj search" text="Enter a topic, question, or website in the search field above." />}
          {resultQuery.isLoading && <State icon={<LoaderCircle className="animate-spin" />} title="Searching BharatKhoj" text="Finding the most relevant results…" />}
          {resultQuery.isError && <State icon={<WifiOff />} title="Search service unavailable" text={resultQuery.error.message} action={<Button onClick={checkAgain}>Try again</Button>} />}
          {resultQuery.data?.status === "unconfigured" && <State icon={<AlertCircle />} title="Search service is not configured yet" text="BharatKhoj is ready to connect to a licensed web-search provider or its own index. No simulated results are shown." />}
          {resultQuery.data?.status === "exhausted" && <State icon={<AlertCircle />} title="BharatKhoj search is temporarily unavailable" text="Our free search quota for this period has been used up. BharatKhoj runs on a free tier only — no fake or simulated results are shown. Once the free quota resets, use the button below to fetch real results." action={<Button onClick={checkAgain} disabled={resultQuery.isFetching}>{resultQuery.isFetching ? "Checking…" : "Check again for real results"}</Button>} />}
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
              {(() => { const related = resultQuery.data.relatedSearches.length > 0 ? resultQuery.data.relatedSearches : (resultQuery.data.results.length > 0 ? buildRelated(query) : []); return related.length > 0 ? <section className="related"><h2>Related searches</h2><div>{related.map((item) => <Link key={item} to="/search" search={{ q: item, page: 1 }}>{item}</Link>)}</div></section> : null; })()}
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
