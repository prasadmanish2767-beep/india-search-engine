import type { SearchResult } from "./search.types";

export type TimeFilter = "any" | "day" | "week" | "month" | "year";
export type LangFilter = "any" | "hi" | "en";
export type TypeFilter = "all" | "news" | "videos" | "pdf" | "web";

export const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "day", label: "Past 24 hours" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
];
export const LANG_OPTIONS: { value: LangFilter; label: string }[] = [
  { value: "any", label: "Any language" },
  { value: "hi", label: "हिन्दी" },
  { value: "en", label: "English" },
];
export const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All results" },
  { value: "news", label: "News" },
  { value: "videos", label: "Videos" },
  { value: "pdf", label: "PDF / Docs" },
  { value: "web", label: "Web pages" },
];

const DAY_MS = 86_400_000;
const WINDOW: Record<Exclude<TimeFilter, "any">, number> = { day: DAY_MS, week: 7 * DAY_MS, month: 31 * DAY_MS, year: 366 * DAY_MS };

const DEVANAGARI = /[\u0900-\u097F]/;
const VIDEO_HOSTS = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|jiocinema|hotstar\.com|rumble\.com)/i;
const NEWS_HOSTS = /(news|times|express|bhaskar|jagran|aajtak|ndtv|thehindu|livemint|hindustantimes|reuters|bbc|abplive|indiatoday|tribune|scroll\.in|thewire)/i;

export function resultLanguage(result: SearchResult): LangFilter {
  return DEVANAGARI.test(`${result.title} ${result.snippet}`) ? "hi" : "en";
}

export function resultType(result: SearchResult): Exclude<TypeFilter, "all"> {
  const url = result.url.toLowerCase();
  if (url.endsWith(".pdf") || url.includes(".pdf?") || /\.(docx?|pptx?|xlsx?)(\?|$)/.test(url)) return "pdf";
  if (VIDEO_HOSTS.test(url)) return "videos";
  if (NEWS_HOSTS.test(url) && result.publishedDate) return "news";
  return "web";
}

function withinTime(result: SearchResult, time: TimeFilter): boolean {
  if (time === "any") return true;
  if (!result.publishedDate) return false;
  const parsed = Date.parse(result.publishedDate);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= WINDOW[time];
}

export function applyFilters(results: SearchResult[], filters: { time: TimeFilter; lang: LangFilter; type: TypeFilter }): SearchResult[] {
  return results.filter((result) => {
    if (!withinTime(result, filters.time)) return false;
    if (filters.lang !== "any" && resultLanguage(result) !== filters.lang) return false;
    if (filters.type !== "all" && resultType(result) !== filters.type) return false;
    return true;
  });
}
