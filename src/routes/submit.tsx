import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Globe2 } from "lucide-react";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const description = "List your website on BharatKhoj and receive a BharatKhoj Listed badge for your platform.";
export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "Add Your Website — BharatKhoj" }, { name: "description", content: description }, { property: "og:title", content: "Add Your Website — BharatKhoj" }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }], links: [{ rel: "canonical", href: "/submit" }] }),
  component: SubmitPage,
});

function SubmitPage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Startup");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ domain: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const embed = submitted ? `<a href="https://india-search-engine.lovable.app/search?q=${encodeURIComponent(submitted.domain)}" target="_blank" rel="noopener noreferrer" aria-label="Find ${submitted.title.replace(/[&<>"']/g, "")} on BharatKhoj"><img src="https://india-search-engine.lovable.app/bharatkhoj-listed-${theme}.svg" alt="BharatKhoj Listed" width="168" height="34" /></a>` : "";
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/submit-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, title, description, category, email }) });
      const data = await response.json() as { domain?: string; title?: string; message?: string };
      if (!response.ok || !data.domain || !data.title) throw new Error(data.message ?? "Submission unavailable.");
      setSubmitted({ domain: data.domain, title: data.title });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Submission unavailable."); }
    finally { setBusy(false); }
  };
  return <ContentLayout title="List your website" intro="Make your platform discoverable on BharatKhoj. Each listed website gets a distinct BharatKhoj signal in search results.">
    {submitted ? <section className="listing-success" role="status"><div className="listing-success-head"><Check aria-hidden="true" /><div><h2>{submitted.title} is listed</h2><p>{submitted.domain} now has a BharatKhoj Listed identity when it appears in search results.</p></div></div><p>Add this badge to your own website:</p><div className="listing-theme" role="group" aria-label="Badge appearance"><Button size="sm" variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>Light</Button><Button size="sm" variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>Dark</Button></div><div className="listing-badge-preview"><img src={`/bharatkhoj-listed-${theme}.svg`} alt="BharatKhoj Listed badge" width="168" height="34" /></div><label className="listing-code-label" htmlFor="listing-code">Embed code</label><textarea id="listing-code" className="listing-code" value={embed} readOnly rows={4} onFocus={(event) => event.target.select()} /><Button onClick={async () => { try { await navigator.clipboard.writeText(embed); setCopied(true); } catch { setError("Copy unavailable. Select the code above to copy it."); } }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy badge code"}</Button>{error && <p className="listing-error" role="alert">{error}</p>}</section> : <div className="listing-layout"><form className="listing-form" onSubmit={submit}><label>Website URL<Input type="url" placeholder="https://yourwebsite.in" value={url} onChange={(event) => setUrl(event.target.value)} required maxLength={2048} pattern="https://.*" /></label><label>Website name<Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={100} /></label><label>Short description<Textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={15} maxLength={160} rows={3} /><small>{description.length}/160</small></label><div className="form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{["Startup", "E-Commerce", "News / Blog", "Education", "Technology", "Local Business", "NGO / Community", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Owner email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label></div><p className="listing-note">Your email stays private. A listing is not ownership or safety verification; submit only websites you control. Appearance depends on real search results.</p>{error && <p className="listing-error" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Adding website…" : "Add website"}</Button></form><aside className="listing-preview"><p>Search result preview</p><div className="result-source"><Globe2 size={26} aria-hidden="true" /><span className="result-source-text"><strong>{title || "Your website"}</strong><small>{url || "https://yourwebsite.in"}</small></span><span className="listed-badge" title="Listed on BharatKhoj; not ownership or safety verified"><span aria-hidden="true" />BharatKhoj Listed</span></div><h2>{title || "Your website name"}</h2><p>{description || "Your short website description will appear here."}</p></aside></div>}
  </ContentLayout>;
}
