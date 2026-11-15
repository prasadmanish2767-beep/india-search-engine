// Free, keyless fallback chain for Web, Images, News, and Videos with Pagination support
import type { SearchResult } from "./search.types";

export type InstantAnswer = { answer: string; source: string; url: string; image?: string | undefined; results: SearchResult[] };

const TIMEOUT_MS = 4000;
const UA = "Mozilla/5.0 (compatible; BharatKhojBot/1.0; +https://bharatkhoj.vercel.app)";

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch { return null; }
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.text();
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

// 1. Web Fallback with Pagination offset
export async function getWebFallback(q: string, page = 1, pageSize = 10): Promise<{ answer?: InstantAnswer; results: SearchResult[]; hasMore: boolean }> {
  const results: SearchResult[] = [];
  const offset = (page - 1) * pageSize;

  // Wikipedia search API supports real offset pagination
  const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&sroffset=${offset}&srlimit=${pageSize + 1}&format=json&origin=*`;
  const wikiData = await getJson(wikiUrl);
  const wikiList = (wikiData?.query as { search?: Array<{ title: string; snippet: string }> } | undefined)?.search ?? [];

  for (const item of wikiList.slice(0, pageSize)) {
    const title = item.title;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
    results.push(toResult(title, url, item.snippet, "Wikipedia"));
  }

  // First page instant answer check via DuckDuckGo
  let answer: InstantAnswer | undefined;
  if (page === 1) {
    const ddg = await getJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`);
    const ansText = clean(ddg?.["AbstractText"]);
    const ansUrl = String(ddg?.["AbstractURL"] ?? "");
    if (ansText && ansUrl.startsWith("https://")) {
      answer = {
        answer: ansText,
        source: String(ddg?.["AbstractSource"] || "Reference"),
        url: ansUrl,
        image: String(ddg?.["Image"] || "") || undefined,
        results: [toResult(String(ddg?.["Heading"] || q), ansUrl, ansText, "Reference")],
      };
    }
  }

  return {
    answer,
    results,
    hasMore: wikiList.length > pageSize,
  };
}

// 2. Images Fallback with Pagination
export async function getImagesFallback(q: string, page = 1, pageSize = 20): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = (page - 1) * pageSize;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsroffset=${offset}&gsrlimit=${pageSize + 1}&gsrnamespace=6&prop=imageinfo&iiprop=url|thumburl|size&iiurlwidth=400&format=json&origin=*`;
  const data = await getJson(url);
  const pages = (data?.query as { pages?: Record<string, { title?: string; imageinfo?: Array<{ url: string; thumburl: string }> }> } | undefined)?.pages;

  const results: SearchResult[] = [];
  if (pages) {
    for (const p of Object.values(pages)) {
      const info = p.imageinfo?.[0];
      if (info?.thumburl && info?.url) {
        const title = (p.title || "").replace(/^File:/, "").replace(/\.[^/.]+$/, "");
        results.push(toResult(title || q, info.url, title, "Wikimedia Commons", info.url, info.thumburl));
      }
    }
  }

  return {
    results: results.slice(0, pageSize),
    hasMore: results.length > pageSize,
  };
}

// 3. News Fallback with Pagination
export async function getNewsFallback(q: string, page = 1, pageSize = 10): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const xml = await getText(rssUrl);
  if (!xml) return { results: [], hasMore: false };

  const allItems: SearchResult[] = [];
  const matches = xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g);

  for (const m of matches) {
    const rawTitle = clean(m[1]);
    const link = clean(m[2]);
    const pubDate = clean(m[3]);
    if (link && rawTitle) {
      allItems.push(toResult(rawTitle, link, `Published on ${pubDate}`, "News"));
    }
  }

  const start = (page - 1) * pageSize;
  const paged = allItems.slice(start, start + pageSize);

  return {
    results: paged,
    hasMore: allItems.length > start + pageSize,
  };
}

// 4. Videos Fallback with Pagination
export async function getVideosFallback(q: string, page = 1, pageSize = 10): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const html = await getText(url);
  if (!html) return { results: [], hasMore: false };

  const allVids: SearchResult[] = [];
  const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  const seen = new Set<string>();

  for (const match of html.matchAll(idRegex)) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);

    allVids.push(toResult(
      `Video: ${q}`,
      `https://www.youtube.com/watch?v=${id}`,
      `Watch on YouTube: ${q}`,
      "YouTube",
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    ));
    if (allVids.length >= 50) break;
  }

  const start = (page - 1) * pageSize;
  const paged = allVids.slice(start, start + pageSize);

  return {
    results: paged,
    hasMore: allVids.length > start + pageSize,
  };
}
