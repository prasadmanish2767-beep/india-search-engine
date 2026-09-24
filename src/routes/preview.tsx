import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import type { SearchResponse, SearchResult } from "@/lib/search.types";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Result preview lab — BharatKhoj" },
      { name: "description", content: "Compare raw and cleaned BharatKhoj search snippets and site logos." },
      { property: "og:title", content: "Result preview lab — BharatKhoj" },
      { property: "og:description", content: "Compare raw and cleaned BharatKhoj search snippets and site logos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreviewPage,
});

function Logo({ r }: { r: SearchResult }) {
  const [failed, setFailed] = useState(false);
  const letter = (r.displayUrl.replace(/^www\./, "")[0] ?? "?").toUpperCase();
  if (!r.favicon || failed) return <span className="site-icon-fallback preview-logo">{letter}</span>;
  return <img className="preview-logo" src={r.favicon} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function PreviewPage() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const data = useQuery({
    queryKey: ["preview", q], enabled: q.length > 0, retry: 0, staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&pageSize=10&debug=1`);
      const json = (await res.json()) as SearchResponse & { message?: string };
      if (!res.ok) throw new Error(json.message || "Search failed");
      return json;
    },
  });
  return (
    <ContentLayout title="Result preview lab" intro="Run a real search and see each site's logo, the raw snippet from the web, and the cleaned text BharatKhoj shows.">
      <form className="preview-form" onSubmit={(e) => { e.preventDefault(); setQ(input.trim().slice(0, 200)); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a real search, e.g. India" aria-label="Preview query" maxLength={200} />
        <Button type="submit" disabled={!input.trim()}>Preview</Button>
      </form>
      {data.isFetching && <p className="preview-note"><LoaderCircle className="animate-spin" /> Fetching real results…</p>}
      {data.isError && <p className="preview-note">{data.error.message}</p>}
      {data.data && data.data.status !== "ok" && <p className="preview-note">{data.data.message ?? "Search is unavailable right now."}</p>}
      {data.data?.status === "ok" && data.data.results.length === 0 && <p className="preview-note">No results for this search.</p>}
      <ul className="preview-list">
        {data.data?.results.map((r) => (
          <li key={r.url}>
            <div className="preview-head"><Logo r={r} /><div><strong>{r.title}</strong><span>{r.displayUrl}</span></div></div>
            <div className="preview-cols">
              <div><h4>Raw from the web</h4><pre>{r.raw?.snippet || "(empty)"}</pre></div>
              <div><h4>Cleaned by BharatKhoj</h4><p>{r.snippet || "(empty)"}</p></div>
            </div>
          </li>
        ))}
      </ul>
    </ContentLayout>
  );
}
