const TEMPLATES = [
  (q: string) => q,
  (q: string) => `${q} in India`,
  (q: string) => `${q} meaning`,
  (q: string) => `${q} latest news`,
  (q: string) => `${q} 2026`,
  (q: string) => `what is ${q}`,
  (q: string) => `how to use ${q}`,
  (q: string) => `best ${q}`,
  (q: string) => `${q} price`,
  (q: string) => `${q} online`,
];

export function buildSuggestions(query: string, limit = 7): string[] {
  const clean = query.trim().replace(/\s+/g, " ");
  if (clean.length < 2) return [];
  const lower = clean.toLowerCase();
  const out: string[] = [];
  for (const template of TEMPLATES) {
    const phrase = template(lower);
    if (!out.includes(phrase)) out.push(phrase);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildRelated(query: string, limit = 6): string[] {
  return buildSuggestions(query, limit + 1)
    .filter((item) => item !== query.trim().toLowerCase())
    .slice(0, limit);
}

const HISTORY_KEY = "bharatkhoj.search-history.v2";
const MAX = 100;
export type HistoryEntry = { q: string; t: number; url?: string; title?: string };

export function readEntries(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
    if (Array.isArray(parsed)) return parsed.filter((e): e is HistoryEntry => !!e && typeof e.q === "string" && typeof e.t === "number").slice(0, MAX * 3);
    return [];
  } catch { return []; }
}
function save(list: HistoryEntry[]) {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX * 3))); window.dispatchEvent(new Event("bharatkhoj-history")); } catch { /* ignore */ }
}
export function readHistory(): string[] { return readEntries().filter((e) => !e.url).map((e) => e.q); }
export function pushHistory(query: string): string[] {
  const clean = query.trim().replace(/\s+/g, " ");
  if (!clean || typeof window === "undefined") return readHistory();
  save([{ q: clean, t: Date.now() }, ...readEntries().filter((e) => e.url || e.q.toLowerCase() !== clean.toLowerCase())]);
  return readHistory();
}
export function pushVisit(query: string, url: string, title: string) {
  if (typeof window === "undefined" || !/^https?:\/\//.test(url)) return;
  save([{ q: query.trim(), t: Date.now(), url, title: title.slice(0, 200) }, ...readEntries().filter((e) => e.url !== url)]);
}
export function removeEntry(entry: HistoryEntry) {
  save(readEntries().filter((e) => !(e.t === entry.t && e.q === entry.q && e.url === entry.url)));
}
export function removeHistory(query: string): string[] {
  save(readEntries().filter((e) => e.url || e.q !== query));
  return readHistory();
}
export function clearHistory() { save([]); }
