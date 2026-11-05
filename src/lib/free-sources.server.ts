// Free, keyless fallback chain: DuckDuckGo Instant Answer -> Wikipedia.
// Each source gets a short timeout; on rate limit, busy, timeout or empty result the next one is tried.
import type { SearchResult } from "./search.types";

export type InstantAnswer = { answer: string; source: string; url: string; image?: string | undefined; results: SearchResult[] };

const TIMEOUT_MS = 2500;
const UA = "BharatKhojBot/1.0 (https://bharatkhoj.vercel.app)";
const cache = new Map<string, { expires: number; value: InstantAnswer | null }>();

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) { console.warn(`Free source busy [${res.status}] ${new URL(url).hostname}`); return null; }
    return (await res.json()) as Record<string, unknown>;
  } catch { return null; }
}

const clean = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const toResult = (title: string, url: string, snippet: string, source: string): SearchResult => ({
  title: clean(title).slice(0, 140), url, displayUrl: host(url) + new URL(url).pathname, snippet: clean(snippet).slice(0, 320), source,
  favicon: `${new URL(url).origin}/favicon.ico`,
});

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
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  let value: InstantAnswer | null = null;
  for (const source of [duckDuckGo, wikipedia]) {
    value = await source(query);
    if (value) break;
  }
  cache.set(key, { expires: Date.now() + (value ? 30 : 5) * 60_000, value });
  return value;
}
