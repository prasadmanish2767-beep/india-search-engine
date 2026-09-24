import type { SearchProvider, SearchResponse, SearchResult, Vertical } from "./search.types";

const cache = new Map<string, { expires: number; value: SearchResponse }>();
const inflight = new Map<string, Promise<SearchResponse>>();
const CACHE_TTL_MS = 60_000;
const EXHAUSTED_TTL_MS = 5 * 60_000;

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch { return null; }
}
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") { const n = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 31 ? String.fromCodePoint(n) : " "; }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
export function text(value: unknown, limit: number): string {
  if (typeof value !== "string") return "";
  const clean = decodeEntities(value)
    .replace(/\\u([0-9a-f]{4})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\[nrt]/g, " ")
    .replace(/\\(["'\\/])/g, "$1")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u200b-\u200d\ufeff]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[[^\]]*\]\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[[a-z0-9]{1,3}\]/gi, " ")
    .replace(/[*_`#>|]+/g, " ")
    .replace(/!?\[[^\]]*\]\(\S*/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/-{2,}/g, " ")
    .replace(/(\s[-–]){2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > limit ? clean.slice(0, limit).replace(/\s\S*$/, "") + "…" : clean;
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
  const image = safeUrl(raw['image']);
  const thumbnail = safeUrl(raw['thumbnail']);
  return {
    ...(image ? { image } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    ...(raw['debug'] ? { raw: { title: typeof raw['title'] === "string" ? raw['title'].slice(0, 600) : "", snippet: typeof raw['snippet'] === "string" ? raw['snippet'].slice(0, 1200) : "" } } : {}),
    title, url,
    displayUrl: text(raw['displayUrl'], 300) || `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`,
    snippet: text(raw['snippet'], 320),
    favicon: favicon ?? `${parsed.origin}/favicon.ico`,
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
    if (!endpoint || !apiKey) return unconfiguredProvider.search(query, page, pageSize, "web", false);
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
  async search(query, page, pageSize, vertical, debug) {
    const lovableKey = process.env['LOVABLE_API_KEY'];
    const connectionKey = process.env['FIRECRAWL_API_KEY'];
    if (!lovableKey || !connectionKey) return unconfiguredProvider.search(query, page, pageSize, vertical, debug);
    const limit = Math.min(pageSize * page, 50);
    const response = await fetch(GATEWAY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify({
        query: vertical === "videos" ? `${query} (site:youtube.com OR site:vimeo.com OR site:dailymotion.com)` : query,
        limit, lang: "en", country: "in",
        sources: [{ type: vertical === "images" ? "images" : vertical === "news" ? "news" : "web" }],
      }),
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
    const payload = (await response.json()) as Record<string, unknown>;
    const bucket = vertical === "images" ? "images" : vertical === "news" ? "news" : "web";
    const container = payload['data'] && typeof payload['data'] === "object" && !Array.isArray(payload['data'])
      ? (payload['data'] as Record<string, unknown>)
      : payload;
    const rawList = Array.isArray(payload['data'])
      ? (payload['data'] as unknown[])
      : Array.isArray(container[bucket]) ? (container[bucket] as unknown[]) : [];
    const all = rawList
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const raw = item as Record<string, unknown>;
        const url = typeof raw['url'] === "string" ? raw['url'] : "";
        const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
        return normalizeResult({
          title: raw['title'],
          url,
          snippet: raw['description'] ?? raw['snippet'],
          publishedDate: raw['date'] ?? raw['publishedDate'],
          image: raw['imageUrl'],
          thumbnail: yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : raw['imageUrl'],
          debug,
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

export async function searchWeb(query: string, page: number, pageSize: number, fresh = false, vertical: Vertical = "web", debug = false): Promise<SearchResponse> {
  const key = `${vertical}:${debug ? 1 : 0}:${query.toLocaleLowerCase()}:${page}:${pageSize}`;
  if (!fresh) {
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
  }
  const pending = inflight.get(key);
  if (pending && !fresh) return pending;
  const start = performance.now();
  const task = (async () => {
    try {
      const result = await getProvider().search(query, page, pageSize, vertical, debug);
      const value: SearchResponse = { ...result, query, page, elapsedMs: Math.max(0, Math.round(performance.now() - start)) };
      if (value.status === "ok") cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
      else if (value.status === "exhausted") cache.set(key, { expires: Date.now() + EXHAUSTED_TTL_MS, value });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}
export async function getSuggestions(query: string): Promise<string[]> { return getProvider().suggestions(query, 6); }
