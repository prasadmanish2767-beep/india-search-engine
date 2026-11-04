import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({ action: z.enum(["verify", "inspect", "sitemap"]), url: z.string().trim().url().max(2048), token: z.string().max(80).optional() });

function publicHttps(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || u.username || u.password || u.port || !u.hostname.includes(".") || u.hostname === "localhost" || /^(?:\d+\.){3}\d+$/.test(u.hostname) || /(?:^|\.)(?:local|internal)$/.test(u.hostname)) throw new Error("bad");
  return u;
}
async function fetchText(u: URL) {
  const res = await fetch(u.toString(), { headers: { "user-agent": "BharatKhojBot/1.0" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
  return { status: res.status, text: (await res.text()).slice(0, 500_000) };
}

export const Route = createFileRoute("/api/console")({ server: { handlers: {
  POST: async ({ request }) => {
    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ message: "Invalid request." }, { status: 400 }); }
    const p = schema.safeParse(body);
    if (!p.success) return Response.json({ message: "Enter a valid URL." }, { status: 400 });
    let u: URL;
    try { u = publicHttps(p.data.url); } catch { return Response.json({ message: "Enter a public HTTPS URL." }, { status: 400 }); }
    const domain = u.hostname.toLowerCase().replace(/^www\./, "");
    try {
      if (p.data.action === "verify") {
        const { text } = await fetchText(new URL(u.origin));
        const token = p.data.token ?? "";
        const found = !!token && new RegExp(`<meta[^>]+name=["']bharatkhoj-site-verification["'][^>]+content=["']${token.replace(/[^\w-]/g, "")}["']`, "i").test(text);
        return Response.json({ verified: found });
      }
      if (p.data.action === "sitemap") {
        const { status, text } = await fetchText(u);
        const pages = (text.match(/<loc>/gi) ?? []).length;
        return Response.json({ ok: status === 200 && pages > 0, status, pages });
      }
      const [{ supabaseAdmin }, live] = await Promise.all([import("@/integrations/supabase/client.server"), fetchText(u).catch(() => ({ status: 0, text: "" }))]);
      const { data } = await supabaseAdmin.from("site_listings").select("title, created_at").eq("domain", domain).maybeSingle();
      const title = live.text.match(/<title[^>]*>([^<]{0,200})/i)?.[1]?.trim() ?? null;
      return Response.json({ listed: !!data, listedSince: data?.created_at ?? null, httpStatus: live.status, title, noindex: /<meta[^>]+noindex/i.test(live.text) });
    } catch {
      return Response.json({ message: "Could not reach this website right now." }, { status: 502 });
    }
  },
} } });
