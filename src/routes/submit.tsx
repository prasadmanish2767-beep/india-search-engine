import { brandImageMeta } from "@/lib/brand";
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Globe2 } from "lucide-react";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const description = "List your website on BharatKhoj: details, ownership verification and indexing status in three steps.";
export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [...brandImageMeta, { title: "Add Your Website — BharatKhoj" }, { name: "description", content: description }, { property: "og:title", content: "Add Your Website — BharatKhoj" }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }], links: [{ rel: "canonical", href: "/submit" }] }),
  component: SubmitPage,
});

const STEPS = ["Details", "Verification", "Indexing Status"];
const CATEGORIES = ["Startup", "E-Commerce", "News / Blog", "Education", "Technology", "Local Business", "NGO / Community", "Other"];
const CONSOLE_KEY = "bharatkhoj.console-properties";
type Property = { url: string; token: string; verified: boolean };
type Inspect = { listed: boolean; httpStatus: number; title: string | null; noindex: boolean };

async function call(body: object) {
  const r = await fetch("/api/console", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message ?? "Request failed.");
  return d;
}

function StepBar({ current }: { current: number }) {
  return <ol className="wizard-steps" aria-label="Listing steps">
    {STEPS.map((name, index) => (
      <li key={name} className={index < current ? "wizard-step is-done" : index === current ? "wizard-step is-active" : "wizard-step"} aria-current={index === current ? "step" : undefined}>
        <span className="wizard-num">{index < current ? <Check aria-hidden="true" /> : index + 1}</span>{name}
      </li>
    ))}
  </ol>;
}

function SubmitPage() {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Startup");
  const [email, setEmail] = useState("");
  const [listing, setListing] = useState<{ domain: string; url: string; title: string } | null>(null);
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [metaCopied, setMetaCopied] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [inspected, setInspected] = useState(false);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapRes, setSitemapRes] = useState("");

  const metaTag = listing ? `<meta name="bharatkhoj-site-verification" content="${token}" />` : "";
  const embed = listing ? `<a href="https://bharatkhoj.vercel.app/search?q=${encodeURIComponent(listing.domain)}" target="_blank" rel="noopener noreferrer" aria-label="Find ${listing.title.replace(/[&<>"']/g, "")} on BharatKhoj"><img src="https://bharatkhoj.vercel.app/bharatkhoj-listed-${theme}.svg" alt="BharatKhoj Listed" width="168" height="34" /></a>` : "";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/submit-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title, description: desc, category, email }) });
      const data = await response.json() as { domain?: string; title?: string; message?: string };
      if (!response.ok || !data.domain || !data.title) throw new Error(data.message ?? "Submission unavailable.");
      const origin = new URL(url).origin;
      const verificationToken = "bk-" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      try {
        const props = JSON.parse(localStorage.getItem(CONSOLE_KEY) || "[]") as Property[];
        if (Array.isArray(props) && !props.some((p) => p.url === origin)) localStorage.setItem(CONSOLE_KEY, JSON.stringify([...props, { url: origin, token: verificationToken, verified: false }]));
      } catch { /* keep going without shared storage */ }
      setListing({ domain: data.domain, url, title: data.title });
      setToken(verificationToken);
      setSitemapUrl(`${origin}/sitemap.xml`);
      setStep(1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Submission unavailable."); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (step !== 2 || !listing || inspected) return;
    setInspected(true);
    (async () => {
      try { setInspect(await call({ action: "inspect", url: listing.url })); }
      catch { setInspect(null); }
    })();
  }, [step, listing, inspected]);

  const verify = async () => {
    if (!listing) return;
    setError(""); setBusy(true);
    try {
      const d = await call({ action: "verify", url: new URL(listing.url).origin, token });
      setVerified(d.verified);
      try {
        const props = JSON.parse(localStorage.getItem(CONSOLE_KEY) || "[]") as Property[];
        if (Array.isArray(props)) localStorage.setItem(CONSOLE_KEY, JSON.stringify(props.map((p) => p.url === new URL(listing.url).origin ? { ...p, verified: d.verified } : p)));
      } catch { /* ignore */ }
      if (d.verified) setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed."); }
    finally { setBusy(false); }
  };

  const doSitemap = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const d = await call({ action: "sitemap", url: sitemapUrl });
      setSitemapRes(d.ok ? `Sitemap read: ${d.pages} pages found.` : `Sitemap could not be read (HTTP ${d.status}).`);
    } catch (cause) { setSitemapRes(cause instanceof Error ? cause.message : "Request failed."); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setStep(0); setListing(null); setToken(""); setVerified(null); setInspect(null); setInspected(false);
    setSitemapUrl(""); setSitemapRes(""); setUrl(""); setTitle(""); setDesc(""); setEmail(""); setError(""); setBusy(false);
  };

  return <ContentLayout title="List your website" intro="Three steps: share your website details, prove ownership, then check how BharatKhoj sees it.">
    <div className="wizard">
      <StepBar current={step} />
      {step === 0 && <div className="listing-layout">
        <form className="listing-form" onSubmit={submit}>
          <label>Website URL<Input type="url" placeholder="https://yourwebsite.in" value={url} onChange={(event) => setUrl(event.target.value)} required maxLength={2048} pattern="https://.*" /></label>
          <label>Website name<Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={100} /></label>
          <label>Short description<Textarea value={desc} onChange={(event) => setDesc(event.target.value)} required minLength={15} maxLength={160} rows={3} /><small>{desc.length}/160</small></label>
          <div className="form-grid">
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Owner email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
          </div>
          <p className="listing-note">Your email stays private. A listing is not ownership or safety verification; submit only websites you control.</p>
          {error && <p className="listing-error" role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Adding website…" : "Add website and continue"}</Button>
        </form>
        <aside className="listing-preview" aria-label="Search result preview">
          <p>Search result preview</p>
          <div className="result-source"><Globe2 size={26} aria-hidden="true" /><span className="result-source-text"><strong>{title || "Your website"}</strong><small>{url || "https://yourwebsite.in"}</small></span><span className="listed-badge" title="Listed on BharatKhoj; not ownership or safety verified"><span aria-hidden="true" />BharatKhoj Listed</span></div>
          <h2>{title || "Your website name"}</h2>
          <p className="listing-desc">{desc || "Your short website description will appear here."}</p>
        </aside>
      </div>}
      {step === 1 && listing && <div className="wizard-panels">
        <section className="wizard-panel">
          <h2>Prove ownership</h2>
          <p>Paste this tag inside the <code>&lt;head&gt;</code> of your homepage, publish, then press Verify. Or add the BharatKhoj badge below — both connect this website to the BharatKhoj Search Console.</p>
          <code className="console-code">{metaTag}</code>
          <div className="wizard-actions">
            <Button onClick={verify} disabled={busy}>{busy ? "Checking…" : "Verify now"}</Button>
            <Button variant="outline" onClick={() => { setMetaCopied(false); navigator.clipboard?.writeText(metaTag).then(() => setMetaCopied(true)).catch(() => { /* select manually */ }); }}>{metaCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{metaCopied ? "Copied" : "Copy tag"}</Button>
            {verified === true && <span className="console-ok">Ownership verified.</span>}
            {verified === false && <span className="console-pending">Verification tag not found on your homepage yet.</span>}
          </div>
        </section>
        <section className="wizard-panel">
          <h2>BharatKhoj Listed badge</h2>
          <p>Show the badge on your website so visitors know you are on BharatKhoj.</p>
          <div className="listing-theme" role="group" aria-label="Badge appearance">
            <Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>Light</Button>
            <Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>Dark</Button>
          </div>
          <div className="listing-badge-preview"><img src={`/bharatkhoj-listed-${theme}.svg`} alt="BharatKhoj Listed badge" width={168} height={34} /></div>
          <label className="listing-code-label" htmlFor="listing-code">Embed code</label>
          <textarea id="listing-code" className="listing-code" value={embed} readOnly rows={4} onFocus={(event) => event.target.select()} />
          <div className="wizard-actions">
            <Button variant="outline" onClick={() => { setBadgeCopied(false); navigator.clipboard?.writeText(embed).then(() => setBadgeCopied(true)).catch(() => { /* select manually */ }); }}>{badgeCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{badgeCopied ? "Copied" : "Copy badge code"}</Button>
          </div>
        </section>
        <div className="wizard-actions">
          <Button onClick={() => { setError(""); setStep(2); }} disabled={busy}>{verified === true ? "Continue to indexing status" : "Continue without verifying"}</Button>
          <Button variant="ghost" onClick={() => setStep(0)}>Back to details</Button>
        </div>
        {error && <p className="listing-error" role="alert">{error}</p>}
      </div>}
      {step === 2 && listing && <div className="wizard-panels">
        <section className="wizard-panel">
          <h2>Indexing status</h2>
          <p>Live check of {listing.domain} as BharatKhoj sees it today.</p>
          {inspect ? <ul className="console-list">
            <li>Page reachable: <b>{inspect.httpStatus === 200 ? "Yes" : `HTTP ${inspect.httpStatus}`}</b></li>
            <li>Title: <b>{inspect.title ?? "Missing"}</b></li>
            <li>Allows indexing: <b>{inspect.noindex ? "No (noindex)" : "Yes"}</b></li>
            <li>BharatKhoj Listed: <b>{inspect.listed ? "Yes" : "Yes — just now"}</b></li>
            <li>Ownership: <b>{verified ? "Verified" : "Not verified yet"}</b></li>
          </ul> : <p>Checking {listing.domain}…</p>}
        </section>
        <section className="wizard-panel">
          <h2>Submit a sitemap</h2>
          <p>Help BharatKhoj discover every page. Most websites publish theirs at /sitemap.xml.</p>
          <form className="console-row" onSubmit={doSitemap}>
            <Input type="url" placeholder={`${new URL(listing.url).origin}/sitemap.xml`} value={sitemapUrl} onChange={(event) => setSitemapUrl(event.target.value)} required />
            <Button type="submit" disabled={busy}>Submit</Button>
          </form>
          {sitemapRes && <p className="wizard-msg" role="status">{sitemapRes}</p>}
        </section>
        <div className="wizard-actions">
          <Button asChild><Link to="/console">Open Search Console</Link></Button>
          <Button variant="outline" onClick={reset}>List another website</Button>
        </div>
      </div>}
    </div>
  </ContentLayout>;
}
