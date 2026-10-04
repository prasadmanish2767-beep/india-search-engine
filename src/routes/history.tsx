import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, ExternalLink, Search, Trash2, X } from "lucide-react";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import { clearHistory, readEntries, removeEntry, type HistoryEntry } from "@/lib/suggest";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Search history — BharatKhoj" },
      { name: "description", content: "Your BharatKhoj searches and visited results, stored only on this device." },
      { property: "og:title", content: "Search history — BharatKhoj" },
      { property: "og:description", content: "Your BharatKhoj searches and visited results, stored only on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

type Range = "30m" | "10h" | "24h" | "all" | "custom";
const RANGES: { value: Range; label: string; ms?: number }[] = [
  { value: "30m", label: "Last 30 minutes", ms: 30 * 60_000 },
  { value: "10h", label: "Last 10 hours", ms: 10 * 3_600_000 },
  { value: "24h", label: "Last 24 hours", ms: 24 * 3_600_000 },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"all" | "searches" | "visits">("all");

  useEffect(() => {
    const sync = () => setEntries(readEntries());
    sync();
    window.addEventListener("bharatkhoj-history", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("bharatkhoj-history", sync); window.removeEventListener("storage", sync); };
  }, []);

  const shown = useMemo(() => {
    const now = Date.now();
    const r = RANGES.find((x) => x.value === range);
    const start = range === "custom" && from ? Date.parse(from) : r?.ms ? now - r.ms : 0;
    const end = range === "custom" && to ? Date.parse(to) : Infinity;
    return entries.filter((e) => e.t >= (start || 0) && e.t <= end && (kind === "all" || (kind === "visits") === !!e.url));
  }, [entries, range, from, to, kind]);

  return (
    <ContentLayout title="Search history" intro="Your searches and opened results are saved only in this browser on BharatKhoj. Nothing is sent to any server.">
      <section className="history-panel">
        <div className="history-ranges" role="group" aria-label="Time range">
          {RANGES.map((r) => <Button key={r.value} size="sm" variant={range === r.value ? "default" : "outline"} onClick={() => setRange(r.value)}>{r.label}</Button>)}
        </div>
        {range === "custom" && (
          <div className="history-custom">
            <label>From <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label>To <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        )}
        <div className="history-bar">
          <select className="filter-select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Entry type">
            <option value="all">Searches & visited results</option>
            <option value="searches">Searches only</option>
            <option value="visits">Visited results only</option>
          </select>
          <span>{shown.length} {shown.length === 1 ? "item" : "items"}</span>
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Clear all search history?")) clearHistory(); }}>
              <Trash2 /> Clear all
            </Button>
          )}
        </div>
        {shown.length === 0 ? (
          <div className="result-state"><Clock3 /><h2>No history in this period</h2><p>Try a wider time range, or start searching.</p><Button asChild><Link to="/">Start searching</Link></Button></div>
        ) : (
          <ul className="history-list">
            {shown.map((e) => (
              <li key={`${e.t}-${e.q}-${e.url ?? ""}`}>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" /><span>{e.title || e.url}<small className="history-sub"> · {new URL(e.url).hostname} · from “{e.q}”</small></span></Link>
                ) : (
                  <Link to="/search" search={{ q: e.q, page: 1 }}><Search aria-hidden="true" /><span>{e.q}</span></Link>
                )}
                <time>{new Date(e.t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                <button type="button" aria-label={`Delete ${e.title || e.q}`} onClick={() => removeEntry(e)}><X /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ContentLayout>
  );
}
