import { Brand } from "@/components/bharatkhoj/Brand";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";
import { Button } from "@/components/ui/button";
import { brandImageMeta, BRAND_ICON_URL } from "@/lib/brand";
import { buildRelated } from "@/lib/filters";
import type { SearchResponse, SearchResult } from "@/lib/search.types";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Clock, ExternalLink, Image as ImageIcon, Newspaper, RotateCcw, Search, SearchX, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AnswerBox } from "@/components/bharatkhoj/AnswerBox";
import { ImageGrid } from "@/components/bharatkhoj/ImageGrid";
import { getCurrentLanguage, t, LanguageCode } from "@/lib/i18n";

type TabId = "all" | "images" | "news" | "videos";

const TABS: { id: TabId; labelKey: string; icon: typeof Search }[] = [
  { id: "all", labelKey: "all", icon: Search },
  { id: "images", labelKey: "images", icon: ImageIcon },
  { id: "news", labelKey: "news", icon: Newspaper },
  { id: "videos", labelKey: "videos", icon: Video },
];

function isFounderQuery(q: string): boolean {
  const norm = q.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  return (
    norm.includes("prem prasad") ||
    norm.includes("pem prasad") ||
    norm.includes("who made bharatkhoj") ||
    norm.includes("who created bharatkhoj") ||
    norm.includes("founder of bharatkhoj") ||
    norm.includes("bharatkhoj founder")
  );
}

const searchParams = z.object({
  q: z.string().catch(""),
  page: z.coerce.number().int().min(1).catch(1),
  time: z.enum(["any", "day", "week", "month", "year"]).catch("any"),
  lang: z.string().catch("all"),
  type: z.enum(["any", "articles", "discussions", "official"]).catch("any"),
  tab: z.enum(["all", "images", "news", "videos"]).catch("all"),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchParams,
  head: ({ search }) => {
    const q = (search.q ?? "").trim();
    const title = q ? `${q} — BharatKhoj` : "Search — BharatKhoj";
    return {
      meta: [
        ...brandImageMeta,
        { title },
        { name: "description", content: `Search results for ${q || "queries"} on BharatKhoj.` },
        { property: "og:title", content: title },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "/search" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, follow" },
      ],
    };
  },
  component: SearchPage,
});

async function fetchResults(query: string, page: number, fresh: boolean, tab: TabId): Promise<SearchResponse> {
  const vertical = tab === "all" ? "web" : tab;
  const response = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${tab === "images" ? 20 : 10}&vertical=${vertical}${fresh ? "&fresh=1" : ""}`
  );
  if (!response.ok) throw new Error(`Search failed: HTTP ${response.status}`);
  return response.json();
}

function SearchPage() {
  const { q, page, tab } = Route.useSearch();
  const query = (q ?? "").trim();
  const freshRef = useRef(false);
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    setLangState(getCurrentLanguage());
  }, []);

  const resultQuery = useQuery({
    queryKey: ["search", tab, query, page],
    queryFn: () => {
      const fresh = freshRef.current;
      freshRef.current = false;
      return fetchResults(query, page, fresh, tab);
    },
    enabled: query.length > 0,
    staleTime: 30_000,
  });

  const visibleResults = resultQuery.data?.results ?? [];

  return (
    <div className="results-page">
      <header className="results-header">
        <Brand />
        <SearchBox initialQuery={query} />
      </header>

      <main className="results-main">
        <nav className="result-tabs" aria-label="Search categories">
          {TABS.map((tItem) => (
            <Link
              key={tItem.id}
              to="/search"
              search={(prev) => ({ ...prev, q: query, page: 1, tab: tItem.id })}
              className={tab === tItem.id ? "active" : undefined}
            >
              {t(tItem.labelKey, lang)}
            </Link>
          ))}
          <Link to="/history" className="tab-history">{t("history", lang)}</Link>
        </nav>

        <section className="results-content">
          {resultQuery.isLoading && <p style={{ padding: "2rem", color: "#666" }}>Searching...</p>}

          {!resultQuery.isLoading && visibleResults.length === 0 && (
            <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
              <SearchX style={{ width: 48, height: 48, margin: "0 auto 1rem", color: "#888" }} />
              <h2>{t("noResults", lang)}</h2>
              <p style={{ color: "#666", marginTop: "0.5rem" }}>{t("tryDifferent", lang)}</p>
            </div>
          )}

          {!resultQuery.isLoading && visibleResults.length > 0 && (
            <>
              {tab === "all" && !isFounderQuery(query) && <AnswerBox query={query} results={visibleResults} />}

              {tab === "images" ? (
                <ImageGrid results={visibleResults} />
              ) : (
                <ol className={`result-list result-list-${tab}`}>
                  {visibleResults.map((result) => (
                    <li key={result.url}>
                      <div className="result-source">
                        <span className="result-source-text">
                          <strong>{result.source || new URL(result.url).hostname}</strong>
                          <small>{result.displayUrl}</small>
                        </span>
                      </div>
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        <h2>{result.title}</h2>
                      </a>
                      <div className="result-body">
                        {result.thumbnail && (
                          <a className={`result-thumb ${tab === "videos" ? "is-video" : ""}`} href={result.url} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
                            <img src={result.thumbnail} alt="" loading="lazy" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                          </a>
                        )}
                        <div>
                          <p>{result.snippet}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {/* Functional Pagination for All & Other Tabs */}
              <nav
                className="pagination"
                aria-label="Search result pages"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1rem",
                  marginTop: "2.5rem",
                  padding: "1rem 0",
                }}
              >
                <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
                  {page > 1 ? (
                    <Link to="/search" search={(prev) => ({ ...prev, q: query, page: page - 1, tab })}>
                      {t("previous", lang)}
                    </Link>
                  ) : (
                    <span>{t("previous", lang)}</span>
                  )}
                </Button>

                <span style={{ fontWeight: 600, color: "#555" }}>
                  {t("page", lang)} {page}
                </span>

                <Button disabled={!resultQuery.data?.hasMore} asChild={Boolean(resultQuery.data?.hasMore)}>
                  {resultQuery.data?.hasMore ? (
                    <Link to="/search" search={(prev) => ({ ...prev, q: query, page: page + 1, tab })}>
                      {t("next", lang)}
                    </Link>
                  ) : (
                    <span>{t("next", lang)}</span>
                  )}
                </Button>
              </nav>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
