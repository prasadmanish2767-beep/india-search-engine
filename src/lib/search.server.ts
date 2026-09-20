import type { SearchProvider, SearchResponse, SearchResult } from "./search.types";

const cache = new Map<string, { expires: number; value: SearchResponse }>();
const CACHE_TTL_MS = 60_000;

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch { return null; }
}
function text(value: unknown, limit: number): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) : "";
}
function normalizeResult(value: unknown): SearchResult | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const url = safeUrl(raw['url']);
  const title = text(raw['title'], 300);
  if (!url || !title) return null;
  const parsed = new URL(url);
  const favicon = safeUrl(raw['favicon']);
  const publishedDate = text(raw['publishedDate'], 80);
  const source = text(raw['source'], 120);
  return {
    title, url,
    displayUrl: text(raw['displayUrl'], 300) || `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`,
    snippet: text(raw['snippet'], 1_000),
    ...(favicon ? { favicon } : {}),
    ...(publishedDate ? { publishedDate } : {}),
    ...(source ? { source } : {}),
  };
}

const unconfiguredProvider: SearchProvider = {
  async search() {
    return { status: "unconfigured", results: [], relatedSearches: [], hasMore: false, message: "Search service is not configured yet" };
  },
  async suggestions() { return []; },
};

const endpointProvider: SearchProvider = {
  async search(query, page, pageSize) {
    const endpoint = process.env['SEARCH_PROVIDER_ENDPOINT'];
    const apiKey = process.env['SEARCH_PROVIDER_API_KEY'];
    if (!endpoint || !apiKey) return unconfiguredProvider.search(query, page, pageSize);
    const target = new URL(endpoint);
    target.searchParams.set("q", query); target.searchParams.set("page", String(page)); target.searchParams.set("pageSize", String(pageSize));
    const response = await fetch(target, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`Search provider failed with status ${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const rawResults = Array.isArray(payload['results']) ? (payload['results'] as unknown[]) : [];
    const rawRelated = payload['relatedSearches'];
    const related = Array.isArray(rawRelated) ? rawRelated.map((item) => text(item, 100)).filter(Boolean).slice(0, 8) : [];
    const results = rawResults.map(normalizeResult).filter((item): item is SearchResult => item !== null);
    const total = payload['total'];
    return { status: "ok", results, relatedSearches: related, ...(typeof total === "number" ? { total } : {}), hasMore: payload['hasMore'] === true };
  },
  async suggestions(query, limit) {
    const endpoint = process.env['SEARCH_SUGGESTIONS_ENDPOINT'];
    const apiKey = process.env['SEARCH_PROVIDER_API_KEY'];
    if (!endpoint || !apiKey) return [];
    const target = new URL(endpoint); target.searchParams.set("q", query); target.searchParams.set("limit", String(limit));
    const response = await fetch(target, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
    if (!response.ok) throw new Error(`Suggestion provider failed with status ${response.status}`);
    const payload = await response.json() as { suggestions?: unknown[] };
    return Array.isArray(payload.suggestions) ? payload.suggestions.map((item) => text(item, 100)).filter(Boolean).slice(0, limit) : [];
  },
};

const GATEWAY_SEARCH_URL = "https://connector-gateway.lovable.dev/firecrawl/v2/search";

const firecrawlProvider: SearchProvider = {
  async search(query, page, pageSize) {
    const lovableKey = process.env['LOVABLE_API_KEY'];
    const connectionKey = process.env['FIRECRAWL_API_KEY'];
    if (!lovableKey || !connectionKey) return unconfiguredProvider.search(query, page, pageSize);
    const limit = Math.min(pageSize * page, 50);
    const response = await fetch(GATEWAY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify({ query, limit, lang: "en", country: "in" }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`BharatKhoj search provider failed [${response.status}]: ${errorBody}`);
      const outOfCredits =
        response.status === 402 ||
        (response.status === 403 && /credit limit reached/i.test(errorBody));
      if (outOfCredits) {
        return {
          status: "exhausted",
          results: [],
          relatedSearches: [],
          hasMore: false,
          message: "Free search quota is exhausted",
        };
      }
      throw new Error(`Search provider failed with status ${response.status}`);
    }
    const payload = (await response.json()) as { data?: unknown; web?: unknown };
    const container = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as { web?: unknown })
      : undefined;
    const rawList = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(container?.web)
        ? (container.web as unknown[])
        : Array.isArray(payload.web)
          ? (payload.web as unknown[])
          : [];
    const all = rawList
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const raw = item as Record<string, unknown>;
        return normalizeResult({
          title: raw['title'],
          url: raw['url'],
          snippet: raw['description'] ?? raw['snippet'],
          publishedDate: raw['date'] ?? raw['publishedDate'],
        });
      })
      .filter((item): item is SearchResult => item !== null);
    const start = (page - 1) * pageSize;
    const results = all.slice(start, start + pageSize);
    return { status: "ok", results, relatedSearches: [], hasMore: all.length > start + pageSize };
  },
  async suggestions() { return []; },
};

function getProvider(): SearchProvider {
  const configured = process.env['SEARCH_PROVIDER'];
  if (configured === "endpoint") return endpointProvider;
  if (configured === "none") return unconfiguredProvider;
  return firecrawlProvider;
}

export async function searchWeb(query: string, page: number, pageSize: number): Promise<SearchResponse> {
  const key = `${query.toLocaleLowerCase()}:${page}:${pageSize}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const start = performance.now();
  const result = await getProvider().search(query, page, pageSize);
  const value: SearchResponse = { ...result, query, page, elapsedMs: Math.max(0, Math.round(performance.now() - start)) };
  if (value.status === "ok") cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}
export async function getSuggestions(query: string): Promise<string[]> { return getProvider().suggestions(query, 6); }
