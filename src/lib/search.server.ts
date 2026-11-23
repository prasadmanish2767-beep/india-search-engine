import type { SearchResponse, Vertical } from "./search.types";
import { getWebFallback, getImagesFallback, getNewsFallback, getVideosFallback } from "./free-sources.server";

const cache = new Map<string, { expires: number; value: SearchResponse }>();
const CACHE_TTL_MS = 60_000; // 60 seconds memory cache to save bandwidth

export async function searchWeb(
  query: string,
  page = 1,
  pageSize = 10,
  fresh = false,
  vertical: Vertical = "web",
  _debug = false
): Promise<SearchResponse> {
  const cleanQ = query.trim();
  const cacheKey = `${vertical}:${cleanQ.toLowerCase()}:${page}:${pageSize}`;

  if (!fresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
  }

  let response: SearchResponse;

  try {
    if (vertical === "images") {
      const data = await getImagesFallback(cleanQ, page, pageSize);
      response = { status: "ok", results: data.results, relatedSearches: [], hasMore: data.hasMore };
    } else if (vertical === "news") {
      const data = await getNewsFallback(cleanQ, page, pageSize);
      response = { status: "ok", results: data.results, relatedSearches: [], hasMore: data.hasMore };
    } else if (vertical === "videos") {
      const data = await getVideosFallback(cleanQ, page, pageSize);
      response = { status: "ok", results: data.results, relatedSearches: [], hasMore: data.hasMore };
    } else {
      // "web" or "all"
      const data = await getWebFallback(cleanQ, page, pageSize);
      response = {
        status: "ok",
        results: data.results,
        relatedSearches: [],
        hasMore: data.hasMore,
        ...(data.answer ? { answer: data.answer.answer } : {}),
      };
    }
  } catch {
    // Circuit breaker: Never return broken state to user
    response = {
      status: "ok",
      results: [],
      relatedSearches: [],
      hasMore: false,
    };
  }

  // Cache successful responses
  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: response });
  return response;
}
