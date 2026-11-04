import { brandImageMeta } from "@/lib/brand";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchResult } from "@/lib/search.types";
import { answerHighlights, imageRelevance } from "@/lib/answer-presentation";

function SiteIcon({ src, label }: { src?: string | undefined; label: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (label.replace(/^www\./, "")[0] ?? "?").toUpperCase();
  if (!src || failed) return <span className="site-icon-fallback" aria-hidden="true">{letter}</span>;
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" width={18} height={18} onError={() => setFailed(true)} />;
}

function HighlightedAnswer({ text, lead = false }: { text: string; lead?: boolean }) {
  return <>{answerHighlights(text, lead).map((part, index) => part.highlighted ? <mark className="answer-highlight" key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>)}</>;
}

function RelevantImage({ source }: { source: { url: string; title: string; image?: string } }) {
  const [failedImage, setFailedImage] = useState<string>();
  if (!source.image || failedImage === source.image) return null;
  return <a className="answer-image" href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`View image source: ${source.title}`}><img src={source.image} alt={source.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImage(source.image)} /><span>{new URL(source.url).hostname}</span></a>;
}

function AnswerBox({ query, results }: { query: string; results: SearchResult[] }) {
  const sources = results.slice(0, 6).map((r) => ({ title: r.title.slice(0, 300), snippet: r.snippet.slice(0, 400), url: r.url, ...(r.image ? { image: r.image } : {}) }));
  const answer = useQuery({
    queryKey: ["answer", query.toLowerCase(), sources],
    enabled: sources.length > 0 && query.length > 1,
    staleTime: Infinity, retry: 0,
    queryFn: async () => {
      const res = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query, sources }) });
      if (!res.ok) return null;
      return (await res.json()) as { answer: string; facts: { text: string; sourceIndex: number }[]; imageIndex: number | null; imageQuery: string | null };
    },
  });
  const suppliedImage = results.find((result) => result.image && imageRelevance(query, result.title) >= 0.5);
  const imageQuery = query;
  const imageResults = useQuery({
    queryKey: ["answer-image", imageQuery],
    enabled: sources.length > 0 && query.length > 1 && !suppliedImage,
    staleTime: Infinity, retry: 0, refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(imageQuery ?? "")}&pageSize=5&vertical=images`);
      if (!response.ok) return [];
      const data = (await response.json()) as SearchResponse;
      return data.status === "ok" ? data.results : [];
    },
  });
  const selectedImage = answer.data?.imageIndex != null ? sources[answer.data.imageIndex] : undefined;
  const imageSource = selectedImage?.image ? selectedImage : suppliedImage ?? imageResults.data?.filter((result) => result.image && imageRelevance(query, result.title) >= 0.5).sort((a, b) => imageRelevance(query, b.title) - imageRelevance(query, a.title))[0];
  if (answer.isLoading) return <section className="answer-box" aria-label="Quick answer" aria-busy="true"><div className="answer-content"><div className="answer-loading"><span /><span /></div>{imageSource?.image && <RelevantImage source={imageSource} />}</div></section>;
  if (!answer.data?.answer) return imageSource?.image ? <section className="search-relevant-image" aria-label="Relevant search image"><RelevantImage source={imageSource} /></section> : null;
  const facts = answer.data.facts?.filter((fact) => sources[fact.sourceIndex]);
  return <section className="answer-box" aria-label="Quick answer">
    <p className="answer-label">BharatKhoj Answer</p>
    <div className="answer-content">
      <p className="answer-text"><HighlightedAnswer text={answer.data.answer} lead /></p>
      {imageSource?.image && <RelevantImage source={imageSource} />}
    </div>
    {facts && facts.length > 0 && <div className="answer-facts"><h2>Key Facts</h2><ul>{facts.map((fact, index) => { const source = sources[fact.sourceIndex]; return source ? <li key={`${index}-${fact.text}`}><span><HighlightedAnswer text={fact.text} lead /></span><a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Source for ${fact.text}`}>{new URL(source.url).hostname}<ExternalLink aria-hidden="true" /></a></li> : null; })}</ul></div>}
  </section>;
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, LoaderCircle, SearchX, Settings2, WifiOff } from "lucide-react";
import { z } from "zod";
import { Brand } from "@/components/bharatkhoj/Brand";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";
import { Button } from "@/components/ui/button";
import { buildRelated, pushHistory, pushVisit, readHistory } from "@/lib/suggest";
import { applyFilters, LANG_OPTIONS, TIME_OPTIONS, TYPE_OPTIONS, type LangFilter, type TimeFilter, type TypeFilter } from "@/lib/filters";
import type { SearchResponse } from "@/lib/search.types";

const searchSchema = z.object({
  q: z.string().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  time: z.string().catch("any"),
  lang: z.string().catch("any"),
  type: z.string().catch("all"),
  listed: z.enum(["1"]).optional().catch(undefined),
  tab: z.enum(["all", "images", "news", "videos"]).catch("all"),
});
export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: (ctx) => {
    const search = (ctx as { search?: { q?: unknown } }).search;
    const q = typeof search?.q === "string" ? search.q.trim().slice(0, 200) : "";
    const title = q ? `${q} — BharatKhoj Search` : "Search — BharatKhoj";
    const description = q ? `Search results for ${q} on BharatKhoj.` : "Search the web with BharatKhoj, India's First Search Engine.";
    return { meta: [...brandImageMeta, { title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { property: "og:url", content: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }, { name: "twitter:card", content: "summary" }, ...(q ? [{ name: "robots", content: "noindex,follow" }] : [])], links: [{ rel: "canonical", href: q ? `/search?q=${encodeURIComponent(q)}` : "/search" }] };
  },
  component: SearchPage,
});

const TABS = [{ id: "all", label: "All", vertical: "web" }, { id: "images", label: "Images", vertical: "images" }, { id: "news", label: "News", vertical: "news" }, { id: "videos", label: "Videos", vertical: "videos" }] as const;
type TabId = (typeof TABS)[number]["id"];

async function fetchResults(query: string, page: number, fresh: boolean, tab: TabId): Promise<SearchResponse> {
  const vertical = TABS.find((t) => t.id === tab)?.vertical ?? "web";
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${tab === "images" ? 20 : 10}&vertical=${vertical}${fresh ? "&fresh=1" : ""}`);
  const payload = await response.json() as SearchResponse & { message?: string };
  if (!response.ok) throw new Error(payload.message || (response.status === 429 ? "Too many searches. Please try again shortly." : "Search is temporarily unavailable."));
  return payload;
}
function SearchPage() {
  const { q, page, time, lang, type, tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const query = q.trim().slice(0, 200);
  const freshRef = useRef(false);
  useEffect(() => {
    if (!query) return;
    if (readHistory()[0]?.toLowerCase() !== query.toLowerCase()) pushHistory(query);
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.("main a[href^='http']") as HTMLAnchorElement | null;
      if (!link) return;
      const destination = link.href;
      if (!destination) return;
      const title = link.closest("li")?.querySelector("h2, .image-caption")?.textContent || link.getAttribute("aria-label") || destination;
      pushVisit(query, destination, title);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("auxclick", onClick, true); };
  }, [query]);
  const resultQuery = useQuery({ queryKey: ["search", tab, query, page], queryFn: () => { const fresh = freshRef.current; freshRef.current = false; return fetchResults(query, page, fresh, tab); }, enabled: query.length > 0, staleTime: 30_000, retry: 0 });
  const checkAgain = () => { freshRef.current = true; resultQuery.refetch(); };
  const timeFilter = (TIME_OPTIONS.some((o) => o.value === time) ? time : "any") as TimeFilter;
  const langFilter = (LANG_OPTIONS.some((o) => o.value === lang) ? lang : "any") as LangFilter;
  const typeFilter = (TYPE_OPTIONS.some((o) => o.value === type) ? type : "all") as TypeFilter;
  const filtersActive = tab === "all" && (timeFilter !== "any" || langFilter !== "any" || typeFilter !== "all");
  const allResults = resultQuery.data?.status === "ok" ? resultQuery.data.results : [];
  const listedOnly = Route.useSearch().listed === "1";
  const visibleResults = useMemo(() => applyFilters(allResults, { time: timeFilter, lang: langFilter, type: typeFilter }).filter((r) => !listedOnly || r.bharatkhojListed), [allResults, timeFilter, langFilter, typeFilter, listedOnly]);
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
        <nav className="result-tabs" aria-label="Search categories">{TABS.map((t) => <Link key={t.id} to="/search" search={(prev) => ({ ...prev, q: query, page: 1, tab: t.id })} className={tab === t.id ? "active" : undefined} aria-current={tab === t.id ? "page" : undefined}>{t.label}</Link>)}<Link to="/history" className="tab-history">History</Link></nav>
        {tab === "all" && allResults.length > 0 && <div className="listed-toggle-row"><button type="button" className={listedOnly ? "listed-toggle active" : "listed-toggle"} aria-pressed={listedOnly} onClick={() => void navigate({ search: (prev) => ({ ...prev, listed: listedOnly ? undefined : "1" }) })}>🇮🇳 BharatKhoj Listed Only</button></div>}
        {false && (
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
          {query && tab === "all" && isFounderQuery(query) && <section className="answer-box" aria-label="Quick answer"><p className="answer-label">BharatKhoj Answer</p><img className="founder-photo" src="/prem-prasad.jpg" alt="Prem Prasad" width={600} height={570} /><p className="answer-text"><mark className="answer-highlight">Prem Prasad</mark> is an Indian young tech entrepreneur and developer, best known as the <mark className="answer-highlight">Founder &amp; CEO of CoreAI</mark>, based in Kolkata, West Bengal.</p><div className="answer-facts"><h2>Key Facts</h2><ul><li><span>Fields: Artificial Intelligence, Web Development, Software Engineering, Digital Innovation</span></li><li><span>Projects: CoreAI, Buzz, AI TryOnix, BharatKhoj</span></li><li><span>Upcoming: next-generation AI projects (<mark className="answer-highlight">2028–2030</mark>)</span></li></ul></div></section>}
          {resultQuery.isLoading && <State icon={<LoaderCircle className="animate-spin" />} title="Searching BharatKhoj" text="Finding the most relevant results…" />}
          {query && (resultQuery.isError || (resultQuery.data && resultQuery.data.status !== "ok")) && <Refine query={query} onRetry={checkAgain} busy={resultQuery.isFetching} />}
          {resultQuery.data?.status === "ok" && (
            <>
              {tab !== "all" && <p className="result-stats">{filtersActive ? `Showing ${visibleResults.length} of ${allResults.length} results after filters` : (typeof resultQuery.data.total === "number" ? `About ${resultQuery.data.total.toLocaleString("en-IN")} results` : `${allResults.length} results`)} ({(resultQuery.data.elapsedMs / 1000).toFixed(2)} seconds)</p>}
              {allResults.length === 0 ? <Refine query={query} onRetry={checkAgain} busy={resultQuery.isFetching} /> : visibleResults.length === 0 ? (
                <State icon={<SearchX />} title="Widen your filters" text="Try a broader time range, language, or result type to see more results." action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} />
              ) : (
                <>{tab === "all" && !isFounderQuery(query) && <AnswerBox query={query} results={visibleResults} />}{tab === "images" ? <ImageGrid results={visibleResults} /> : <ol className={`result-list result-list-${tab}`}>{visibleResults.map((result) => <li key={result.url}>
                  <div className="result-source"><SiteIcon src={result.favicon} label={result.displayUrl} /><span className="result-source-text"><strong>{result.source || new URL(result.url).hostname}</strong><small>{result.displayUrl}</small></span>{result.bharatkhojListed && <span className="listed-badge" tabIndex={0} title="This website was added to the BharatKhoj registry by its owner. A listing is not a safety guarantee.">🇮🇳 BharatKhoj Listed</span>}</div>
                  <a href={result.url} target="_blank" rel="noopener noreferrer"><h2>{result.title}</h2></a>
                  <div className="result-body">{result.thumbnail && <a className={`result-thumb ${tab === "videos" ? "is-video" : ""}`} href={result.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true"><img src={result.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} /></a>}<div><p>{result.snippet}</p>{result.publishedDate && <time>{result.publishedDate}</time>}</div></div>
                </li>)}</ol>}
                 </>
              )}
              {tab !== "all" && visibleResults.length > 0 && <nav className="pagination" aria-label="Search result pages"><Button variant="outline" disabled={page <= 1} asChild={page > 1}><Link to="/search" search={(prev) => ({ ...prev, q: query, page: page - 1 })}>Previous</Link></Button><span>Page {page}</span><Button disabled={!resultQuery.data.hasMore} asChild={resultQuery.data.hasMore}><Link to="/search" search={(prev) => ({ ...prev, q: query, page: page + 1 })}>Next</Link></Button></nav>}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
function Refine({ query, onRetry, busy }: { query: string; onRetry: () => void; busy: boolean }) {
  const ideas = buildRelated(query, 6);
  return (
    <section className="related" aria-label="Refine your search">
      <h2>Refine your search for “{query}”</h2>
      <div>{ideas.map((s) => <Link key={s} to="/search" search={{ q: s, page: 1 }}>{s}</Link>)}</div>
      <p><Button variant="outline" onClick={onRetry} disabled={busy}>{busy ? "Searching…" : "Search again"}</Button></p>
    </section>
  );
}
function ImageGrid({ results }: { results: SearchResult[] }) {
  const shown = results.filter((r) => r.image);
  if (!shown.length) return <State icon={<SearchX />} title="No images found" text="Try a different or broader search." />;
  return <ul className="image-grid">{shown.map((r) => <li key={r.url + r.image}><a href={r.url} target="_blank" rel="noopener noreferrer"><img src={r.image} alt={r.title} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget.closest("li") as HTMLElement).style.display = "none"; }} /><span className="image-caption">{r.title}</span><span className="image-source"><SiteIcon src={r.favicon} label={r.displayUrl} />{r.displayUrl.split("/")[0]}</span></a></li>)}</ul>;
}
function State({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) { return <div className="result-state">{icon}<h2>{title}</h2><p>{text}</p>{action}</div>; }

function FilterSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <label className="filter-select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} aria-label={label}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
function isFounderQuery(q: string) {
  const s = q.toLowerCase().replace(/\s+/g, " ").trim();
  return /\bpr[ae]m prasad\b/.test(s) || /coreai (founder|ceo)/.test(s) || /(founder|ceo) of coreai/.test(s);
}
const FOUNDER_PROJECTS = [
  { name: "CoreAI", url: "https://coreaii.vercel.app/" },
  { name: "Buzz", url: "https://buzzofficial.vercel.app/" },
  { name: "AI TryOnix", url: "https://aitryonix.vercel.app/" },
  { name: "BharatKhoj", url: "https://bharatkhoj.vercel.app/" },
];
function FounderCard() {
  return (
    <section className="founder-card" aria-label="Prem Prasad profile">
      <img src="/prem-prasad.jpg" alt="Prem Prasad" width={600} height={570} />
      <div>
        <h2>Prem Prasad</h2>
        <p className="founder-role">Founder &amp; CEO, CoreAI · Kolkata, West Bengal</p>
        <p>Prem Prasad is an Indian young tech entrepreneur, developer, and Founder &amp; CEO of CoreAI, based in Kolkata, West Bengal. His fields include Artificial Intelligence, Web Development, Software Engineering, and Digital Innovation.</p>
        <p><strong>Projects:</strong> CoreAI, Buzz, AI TryOnix, and BharatKhoj.</p>
        <p><strong>Upcoming:</strong> Next-generation AI and technology projects (2028–2030).</p>
        <p className="founder-links"><strong>Official Projects:</strong> {FOUNDER_PROJECTS.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a>)}</p>
      </div>
    </section>
  );
}
