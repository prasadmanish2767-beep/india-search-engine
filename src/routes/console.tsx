import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brandImageMeta } from "@/lib/brand";

const desc = "BharatKhoj Search Console: verify your website, inspect URLs and submit sitemaps.";
export const Route = createFileRoute("/console")({
  head: () => ({ meta: [...brandImageMeta, { title: "Search Console — BharatKhoj" }, { name: "description", content: desc }, { property: "og:title", content: "Search Console — BharatKhoj" }, { property: "og:description", content: desc }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }], links: [{ rel: "canonical", href: "/console" }] }),
  component: ConsolePage,
});

type Property = { url: string; token: string; verified: boolean };
const KEY = "bharatkhoj.console-properties";

async function call(body: object) {
  const r = await fetch("/api/console", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message ?? "Request failed.");
  return d;
}

function ConsolePage() {
  const [props, setProps] = useState<Property[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [active, setActive] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [inspectUrl, setInspectUrl] = useState("");
  const [inspect, setInspect] = useState<{ listed: boolean; httpStatus: number; title: string | null; noindex: boolean } | null>(null);
  const [sitemap, setSitemap] = useState("");
  const [sitemapRes, setSitemapRes] = useState("");

  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(KEY) || "[]"); setProps(p); setActive(p[0]?.url ?? ""); } catch { /* empty */ } }, []);
  const save = (p: Property[]) => { setProps(p); localStorage.setItem(KEY, JSON.stringify(p)); };
  const current = props.find((p) => p.url === active);

  const add = (e: FormEvent) => {
    e.preventDefault(); setMsg("");
    try {
      const u = new URL(newUrl.trim());
      if (u.protocol !== "https:") throw new Error();
      if (props.some((p) => p.url === u.origin)) { setActive(u.origin); return; }
      const token = "bk-" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      save([...props, { url: u.origin, token, verified: false }]); setActive(u.origin); setNewUrl("");
    } catch { setMsg("Enter a valid HTTPS website address."); }
  };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(""); try { await fn(); } catch (e) { setMsg(e instanceof Error ? e.message : "Request failed."); } finally { setBusy(false); } };
  const verify = () => run(async () => {
    if (!current) return;
    const d = await call({ action: "verify", url: current.url, token: current.token });
    save(props.map((p) => p.url === current.url ? { ...p, verified: d.verified } : p));
    setMsg(d.verified ? "Ownership verified." : "Verification tag not found on your homepage yet.");
  });
  const doInspect = (e: FormEvent) => { e.preventDefault(); run(async () => setInspect(await call({ action: "inspect", url: inspectUrl || current?.url || "" }))); };
  const doSitemap = (e: FormEvent) => { e.preventDefault(); run(async () => { const d = await call({ action: "sitemap", url: sitemap || `${current?.url}/sitemap.xml` }); setSitemapRes(d.ok ? `Sitemap read: ${d.pages} pages found.` : `Sitemap could not be read (HTTP ${d.status}).`); }); };

  return <ContentLayout title="BharatKhoj Search Console" intro="Add your website, prove ownership, check pages and submit your sitemap.">
    <div className="console">
      <section className="console-card"><h2>1. Add property</h2>
        <form className="console-row" onSubmit={add}><Input type="url" placeholder="https://yourwebsite.in" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required /><Button type="submit">Add</Button></form>
        {props.length > 0 && <div className="console-props">{props.map((p) => <button key={p.url} type="button" className={p.url === active ? "console-prop is-active" : "console-prop"} onClick={() => setActive(p.url)}>{new URL(p.url).hostname}<span className={p.verified ? "console-ok" : "console-pending"}>{p.verified ? "Verified" : "Not verified"}</span></button>)}</div>}
      </section>
      {current && <>
        <section className="console-card"><h2>2. Verify ownership</h2><p>Paste this tag inside the &lt;head&gt; of your homepage, publish, then press Verify.</p>
          <code className="console-code">{`<meta name="bharatkhoj-site-verification" content="${current.token}" />`}</code>
          <Button onClick={verify} disabled={busy}>Verify now</Button></section>
        <section className="console-card"><h2>3. URL inspection</h2>
          <form className="console-row" onSubmit={doInspect}><Input type="url" placeholder={current.url} value={inspectUrl} onChange={(e) => setInspectUrl(e.target.value)} /><Button type="submit" disabled={busy}>Inspect</Button></form>
          {inspect && <ul className="console-list"><li>Page reachable: <b>{inspect.httpStatus === 200 ? "Yes" : `HTTP ${inspect.httpStatus}`}</b></li><li>Title: <b>{inspect.title ?? "Missing"}</b></li><li>Allows indexing: <b>{inspect.noindex ? "No (noindex)" : "Yes"}</b></li><li>BharatKhoj Listed: <b>{inspect.listed ? "Yes" : "No"}</b>{!inspect.listed && <> — <Link to="/submit">list it</Link></>}</li></ul>}
        </section>
        <section className="console-card"><h2>4. Sitemap</h2>
          <form className="console-row" onSubmit={doSitemap}><Input type="url" placeholder={`${current.url}/sitemap.xml`} value={sitemap} onChange={(e) => setSitemap(e.target.value)} /><Button type="submit" disabled={busy}>Submit</Button></form>
          {sitemapRes && <p>{sitemapRes}</p>}</section>
      </>}
      {msg && <p className="console-msg" role="status">{msg}</p>}
    </div>
  </ContentLayout>;
}
