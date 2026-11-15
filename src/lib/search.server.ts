import type { SearchProvider, SearchResponse, SearchResult, Vertical } from "./search.types";
import { getWebFallback, getImagesFallback, getNewsFallback, getVideosFallback } from "./free-sources.server";

const cache = new Map<string, { expires: number; value: SearchResponse }>();
const CACHE_TTL_MS = 60_000;

export async function searchWeb(
  query: string,
  page = 1,
  pageSize = 10,
  fresh = false,
  vertical: Vertical = "web",
  debug = false
): Promise<SearchResponse> {
  const cacheKey = `${vertical}:${query}:${page}:${pageSize}`;
  if (!fresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
  }

  let response: SearchResponse;

  if (vertical === "images") {
    const data = await getImagesFallback(query, page, pageSize);
    response = { status: "ok", results: data.results, relatedSearches: [], hasMore: data.hasMore };
  } else if (vertical === "news") {
    const data = await getNewsFallback(query, page, pageSize);
    response = { status: "ok", results: data.results, relatedSearches: [], hasMore: data.hasMore };
  } else if (vertical === "videos") {
    const data = await getVideosFallback(query, page, pageSize);
    response = { status: "ok", results: data.results, relatedSearches: [], hasMore: data.hasMore };
  } else {
    // "web" or "all"
    const data = await getWebFallback(query, page, pageSize);
    response = {
      status: "ok",
      results: data.results,
      relatedSearches: [],
      hasMore: data.hasMore,
      ...(data.answer ? { answer: data.answer.answer } : {}),
    };
  }

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: response });
  return response;
}
