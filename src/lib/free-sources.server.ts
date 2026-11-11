// Free, keyless fallback chain for Web, Images, News, and Videos
import type { SearchResult, Vertical } from "./search.types";

export type InstantAnswer = { answer: string; source: string; url: string; image?: string | undefined; results: SearchResult[] };

const TIMEOUT_MS = 3500;
const UA = "Mozilla/5.0 (compatible; BharatKhojBot/1.0; +https://bharatkhoj.vercel.app)";
const cache = new Map<string, { expires: number; value: SearchResult[] }>();

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch { return null; }
}

const clean = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

const toResult = (title: string, url: string, snippet: string, source: string, image?: string, thumbnail?: string): SearchResult => ({
  title: clean(title).slice(0, 140),
  url,
  displayUrl: host(url) + (new URL(url).pathname === "/" ? "" : new URL(url).pathname),
  snippet: clean(snippet).slice(0, 320),
  source,
  favicon: `${new URL(url).origin}/favicon.ico`,
  ...(image ? { image } : {}),
  ...(thumbnail ? { thumbnail } : {}),
});

// 1. Web Fallback (DuckDuckGo + Wikipedia)
async function duckDuckGo(q: string): Promise<InstantAnswer | null> {
  const d = await getJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`);
  const answer = clean(d?.["AbstractText"]);
  const url = String(d?.["AbstractURL"] ?? "");
  if (!d || !answer || !url.startsWith("https://")) return null;
  const img = String(d["Image"] ?? "");
  const results: SearchResult[] = [toResult(String(d["Heading"] || q), url, answer, String(d["AbstractSource"] || "Reference"))];
  for (const t of (d["RelatedTopics"] as { FirstURL?: string; Text?: string }[] | undefined) ?? []) {
    if (results.length >= 6) break;
    if (t.FirstURL?.startsWith("https://") && t.Text) results.push(toResult(t.Text.split(" - ")[0] ?? t.Text, t.FirstURL, t.Text, "DuckDuckGo"));
  }
  return { answer, source: String(d["AbstractSource"] || "Reference"), url, image: img ? (img.startsWith("http") ? img : `https://duckduckgo.com${img}`) : undefined, results };
}

async function wikipedia(q: string): Promise<InstantAnswer | null> {
  const s = await getJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=6&format=json&origin=*`);
  const hits = ((s?.["query"] as { search?: { title: string; snippet: string }[] } | undefined)?.search) ?? [];
  if (!hits.length) return null;
  const sum = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hits[0]!.title.replace(/ /g, "_"))}`);
  const first = hits[0]!;
  const answer = clean(sum?.["extract"]);
  const pageUrl = (t: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
  const results = hits.map((h) => toResult(h.title, pageUrl(h.title), h.snippet, "Wikipedia"));
  if (!answer) return null;
  const thumb = (sum?.["thumbnail"] as { source?: string } | undefined)?.source;
  return { answer, source: "Wikipedia", url: pageUrl(first.title), image: thumb, results };
}

export async function freeInstantAnswer(query: string): Promise<InstantAnswer | null> {
  for (const source of [duckDuckGo, wikipedia]) {
    const value = await source(query);
    if (value) return value;
  }
  return null;
}

// 2. Images Fallback (Wikipedia / Wikimedia PageImages)
export async function freeImages(q: string): Promise<SearchResult[]> {
  const cacheKey = `img:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=20&prop=pageimages|extracts&piprop=thumbnail|original&pithumbsize=600&exintro=1&explaintext=1&exsentences=1&format=json&origin=*`;
  const data = await getJson(url);
  const pages = (data?.["query"] as { pages?: Record<string, { title: string; thumbnail?: { source: string }; original?: { source: string }; extract?: string }> })?.pages;
  
  const results: SearchResult[] = [];
  if (pages) {
    for (const page of Object.values(pages)) {
      const imgUrl = page.original?.source || page.thumbnail?.source;
      if (!imgUrl) continue;
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`;
      results.push(toResult(page.title, pageUrl, page.extract || page.title, "Wikipedia", imgUrl, page.thumbnail?.source || imgUrl));
    }
  }
  cache.set(cacheKey, { expires: Date.now() + 30 * 60_000, value: results });
  return results;
}

// 3. News Fallback (Google News RSS Feed)
export async function freeNews(q: string): Promise<SearchResult[]> {
  const cacheKey = `news:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const results: SearchResult[] = [];
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
      for (const item of items.slice(0, 15)) {
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
        const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

        let rawTitle = clean(titleMatch?.[1] || "");
        const source = clean(sourceMatch?.[1] || "News");
        if (rawTitle.includes(" - ")) rawTitle = rawTitle.split(" - ")[0] || rawTitle;
        const link = clean(linkMatch?.[1] || "");
        const pubDate = clean(dateMatch?.[1] || "");

        if (link.startsWith("http")) {
          const itemRes = toResult(rawTitle, link, `${source} • ${pubDate}`, source);
          if (pubDate) itemRes.publishedDate = pubDate;
          results.push(itemRes);
        }
      }
    }
  } catch (e) { console.error("Free news error", e); }

  cache.set(cacheKey, { expires: Date.now() + 15 * 60_000, value: results });
  return results;
}

// 4. Videos Fallback (YouTube Search)
export async function freeVideos(q: string): Promise<SearchResult[]> {
  const cacheKey = `vid:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const results: SearchResult[] = [];
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const html = await res.text();
      const m = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (m && m[1]) {
        const data = JSON.parse(m[1]) as Record<string, unknown>;
        const sectionList = (data?.["contents"] as any)?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const sec of sectionList) {
          const items = sec?.itemSectionRenderer?.contents || [];
          for (const it of items) {
            const v = it?.videoRenderer;
            if (!v?.videoId) continue;
            const vid = v.videoId;
            const title = (v.title?.runs || []).map((r: any) => r.text).join("");
            const channel = (v.ownerText?.runs || []).map((r: any) => r.text).join("") || "YouTube";
            const snippet = (v.detailedMetadataSnippets?.[0]?.snippetText?.runs || []).map((r: any) => r.text).join("") || `${channel} on YouTube`;
            const thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
            const videoUrl = `https://www.youtube.com/watch?v=${vid}`;
            results.push(toResult(title, videoUrl, snippet, channel, undefined, thumb));
            if (results.length >= 12) break;
          }
          if (results.length >= 12) break;
        }
      }
    }
  } catch (e) { console.error("Free videos error", e); }

  cache.set(cacheKey, { expires: Date.now() + 30 * 60_000, value: results });
  return results;
}
