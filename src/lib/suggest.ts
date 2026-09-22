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

const HISTORY_KEY = "bharatkhoj.recent-searches";

export function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function pushHistory(query: string): string[] {
  const clean = query.trim().replace(/\s+/g, " ");
  if (!clean || typeof window === "undefined") return readHistory();
  const next = [clean, ...readHistory().filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function removeHistory(query: string): string[] {
  const next = readHistory().filter((item) => item !== query);
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
