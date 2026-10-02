import { supabase } from "@/integrations/supabase/client";
import type { SearchResult } from "./search.types";

export async function markListed(results: SearchResult[]): Promise<SearchResult[]> {
  const domains = [...new Set(results.map((result) => new URL(result.url).hostname.toLowerCase().replace(/^www\./, "")))];
  if (!domains.length) return results;
  try {
    const { data, error } = await supabase.from("site_listings").select("domain").in("domain", domains);
    if (error) throw error;
    const listed = new Set(data?.map((row) => row.domain));
    return results.map((result) => ({ ...result, ...(listed.has(new URL(result.url).hostname.toLowerCase().replace(/^www\./, "")) ? { bharatkhojListed: true } : {}) }));
  } catch (error) {
    console.error("BharatKhoj listing lookup failed", error);
    return results;
  }
}
