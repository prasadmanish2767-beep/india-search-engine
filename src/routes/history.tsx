import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, Search, Trash2, X } from "lucide-react";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import { clearHistory, readEntries, removeHistory, type HistoryEntry } from "@/lib/suggest";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Search history — BharatKhoj" },
      { name: "description", content: "Your BharatKhoj search history, stored only on this device." },
      { property: "og:title", content: "Search history — BharatKhoj" },
      { property: "og:description", content: "Your BharatKhoj search history, stored only on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    const sync = () => setEntries(readEntries());
    sync();
    window.addEventListener("bharatkhoj-history", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("bharatkhoj-history", sync); window.removeEventListener("storage", sync); };
  }, []);

  return (
    <ContentLayout title="Search history" intro="Saved only in this browser. Nothing is sent to any server.">
      <section className="history-panel">
        <div className="history-bar">
          <span>{entries.length} {entries.length === 1 ? "search" : "searches"}</span>
          {entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Clear all search history?")) clearHistory(); }}>
              <Trash2 /> Clear all history
            </Button>
          )}
        </div>
        {entries.length === 0 ? (
          <div className="result-state"><Clock3 /><h2>No searches yet</h2><p>Your searches will appear here.</p><Button asChild><Link to="/">Start searching</Link></Button></div>
        ) : (
          <ul className="history-list">
            {entries.map((e) => (
              <li key={e.q + e.t}>
                <Link to="/search" search={{ q: e.q, page: 1 }}><Search aria-hidden="true" /><span>{e.q}</span></Link>
                <time>{new Date(e.t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                <button type="button" aria-label={`Delete ${e.q}`} onClick={() => removeHistory(e.q)}><X /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ContentLayout>
  );
}
