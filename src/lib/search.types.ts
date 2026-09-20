export type SearchResult = {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  favicon?: string;
  publishedDate?: string;
  source?: string;
};
export type SearchResponse = {
  status: "ok" | "unconfigured" | "exhausted";
  query: string;
  results: SearchResult[];
  relatedSearches: string[];
  total?: number;
  elapsedMs: number;
  page: number;
  hasMore: boolean;
  message?: string;
};
export type SearchProvider = {
  search: (query: string, page: number, pageSize: number) => Promise<Omit<SearchResponse, "query" | "elapsedMs" | "page">>;
  suggestions: (query: string, limit: number) => Promise<string[]>;
};
