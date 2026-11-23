// Multi-Tier Zero-Cost Fallback Chain for BharatKhoj
// Sources: Wikipedia REST, Wikimedia Commons, Google News RSS, Bing News RSS, YouTube Feeds
import type { SearchResult } from "./search.types";

export type InstantAnswer = {
  answer: string;
  source: string;
  url: string;
  image?: string | undefined;
  results: SearchResult[];
};

const TIMEOUT_MS = 3800;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 BharatKhoj/1.0";

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const toResult = (
  title: string,
  url: string,
  snippet: string,
  source: string,
  image?: string,
  thumbnail?: string
): SearchResult => {
  let displayUrl = "";
  let favicon = "";
  try {
    const parsed = new URL(url);
    displayUrl = host(url) + (parsed.pathname === "/" ? "" : parsed.pathname);
    favicon = `${parsed.origin}/favicon.ico`;
  } catch {
    displayUrl = url;
  }

  return {
    title: clean(title).slice(0, 140),
    url,
    displayUrl: displayUrl.slice(0, 80),
    snippet: clean(snippet).slice(0, 320),
    source,
    ...(favicon ? { favicon } : {}),
    ...(image ? { image } : {}),
    ...(thumbnail ? { thumbnail } : {}),
  };
};

// ==========================================
// 1. FREE INSTANT ANSWER (Connected to /api/answer)
// ==========================================
export async function freeInstantAnswer(q: string): Promise<{ answer: string; source: string; url: string; image?: string } | null> {
  try {
    // Tier 1: Wikipedia REST API (Direct encyclopedia summary + image)
    const formatted = encodeURIComponent(q.trim().replace(/\s+/g, "_"));
    const wikiRes = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${formatted}`);
    if (wikiRes && typeof wikiRes["extract"] === "string" && wikiRes["extract"].length > 40) {
      const thumb = wikiRes["thumbnail"] as { source?: string } | undefined;
      const contentUrls = wikiRes["content_urls"] as { desktop?: { page?: string } } | undefined;
      return {
        answer: clean(wikiRes["extract"]),
        source: "Wikipedia",
        url: contentUrls?.desktop?.page || `https://en.wikipedia.org/wiki/${formatted}`,
        image: thumb?.source,
      };
    }

    // Tier 2: DuckDuckGo Instant Answer API
    const ddg = await getJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`);
    const ansText = clean(ddg?.["AbstractText"]);
    const ansUrl = String(ddg?.["AbstractURL"] ?? "");
    if (ansText && ansUrl.startsWith("https://")) {
      return {
        answer: ansText,
        source: String(ddg?.["AbstractSource"] || "Reference"),
        url: ansUrl,
        image: String(ddg?.["Image"] || "") || undefined,
      };
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

// ==========================================
// 2. WEB FALLBACK (All Tab with Offset Pagination)
// ==========================================
export async function getWebFallback(
  q: string,
  page = 1,
  pageSize = 10
): Promise<{ answer?: InstantAnswer; results: SearchResult[]; hasMore: boolean }> {
  const results: SearchResult[] = [];
  const offset = (page - 1) * pageSize;

  // Primary: Wikipedia full-text search with real pagination
  const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    q
  )}&sroffset=${offset}&srlimit=${pageSize + 1}&format=json&origin=*`;
  const wikiData = await getJson(wikiUrl);
  const wikiList = (wikiData?.query as { search?: Array<{ title: string; snippet: string }> } | undefined)?.search ?? [];

  for (const item of wikiList.slice(0, pageSize)) {
    const title = item.title;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
    results.push(toResult(title, url, item.snippet, "Wikipedia"));
  }

  // Answer Card on Page 1
  let answer: InstantAnswer | undefined;
  if (page === 1) {
    const instant = await freeInstantAnswer(q);
    if (instant) {
      answer = {
        answer: instant.answer,
        source: instant.source,
        url: instant.url,
        image: instant.image,
        results: [toResult(q, instant.url, instant.answer, instant.source, instant.image)],
      };
    }
  }

  return {
    answer,
    results,
    hasMore: wikiList.length > pageSize,
  };
}

// ==========================================
// 3. IMAGES FALLBACK (Images Tab)
// ==========================================
export async function getImagesFallback(
  q: string,
  page = 1,
  pageSize = 20
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = (page - 1) * pageSize;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    q
  )}&gsroffset=${offset}&gsrlimit=${pageSize + 1}&gsrnamespace=6&prop=imageinfo&iiprop=url|thumburl|size&iiurlwidth=400&format=json&origin=*`;
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

// ==========================================
// 4. NEWS FALLBACK (Google News RSS -> Bing News RSS)
// ==========================================
export async function getNewsFallback(
  q: string,
  page = 1,
  pageSize = 10
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const allItems: SearchResult[] = [];

  // Tier 1: Google News India Live RSS
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const xml = await getText(rssUrl);
    if (xml) {
      const matches = xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g);
      for (const m of matches) {
        const rawTitle = clean(m[1]);
        const link = clean(m[2]);
        const pubDate = clean(m[3]);
        if (link && rawTitle) {
          allItems.push(toResult(rawTitle, link, `Published on ${pubDate}`, "Google News"));
        }
      }
    }
  } catch {
    // Failover to Tier 2
  }

  // Tier 2: Bing News India RSS (If Tier 1 has insufficient items)
  if (allItems.length < pageSize) {
    try {
      const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss`;
      const bingXml = await getText(bingUrl);
      if (bingXml) {
        const matches = bingXml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<description>(.*?)<\/description>[\s\S]*?<\/item>/g);
        for (const m of matches) {
          const rawTitle = clean(m[1]);
          const link = clean(m[2]);
          const desc = clean(m[3]);
          if (link && rawTitle) {
            allItems.push(toResult(rawTitle, link, desc || "Latest breaking news", "Bing News"));
          }
        }
      }
    } catch {
      // Graceful
    }
  }

  const start = (page - 1) * pageSize;
  const paged = allItems.slice(start, start + pageSize);

  return {
    results: paged,
    hasMore: allItems.length > start + pageSize,
  };
}

// ==========================================
// 5. VIDEOS FALLBACK (YouTube Live Parser)
// ==========================================
export async function getVideosFallback(
  q: string,
  page = 1,
  pageSize = 10
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const allVids: SearchResult[] = [];

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const html = await getText(url);
    if (html) {
      const idMatches = Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)).map((m) => m[1]);
      const titleMatches = Array.from(html.matchAll(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/g)).map((m) => m[1]);

      const seen = new Set<string>();
      for (let i = 0; i < idMatches.length; i++) {
        const id = idMatches[i];
        if (!id || seen.has(id)) continue;
        seen.add(id);

        const videoTitle = titleMatches[i] ? clean(titleMatches[i]) : `${q} - Watch Video`;
        allVids.push(
          toResult(
            videoTitle,
            `https://www.youtube.com/watch?v=${id}`,
            `Watch "${videoTitle}" on YouTube`,
            "YouTube",
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
          )
        );
        if (allVids.length >= 60) break;
      }
    }
  } catch {
    // Graceful
  }

  const start = (page - 1) * pageSize;
  const paged = allVids.slice(start, start + pageSize);

  return {
    results: paged,
    hasMore: allVids.length > start + pageSize,
  };
}
