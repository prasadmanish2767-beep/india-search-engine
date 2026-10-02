import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  url: z.string().trim().url().max(2048),
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(15).max(160),
  category: z.enum(["Startup", "E-Commerce", "News / Blog", "Education", "Technology", "Local Business", "NGO / Community", "Other"]),
  email: z.string().trim().email().max(254),
});
const attempts = new Map<string, number[]>();

export const Route = createFileRoute("/api/submit-site")({ server: { handlers: {
  POST: async ({ request }) => {
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const now = Date.now();
    const recent = (attempts.get(ip) ?? []).filter((time) => now - time < 60 * 60_000);
    if (recent.length >= 5) return Response.json({ message: "Too many submissions. Please try again later." }, { status: 429 });
    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ message: "Invalid submission." }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ message: "Please check all fields and try again." }, { status: 400 });
    const url = new URL(parsed.data.url);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".") || url.hostname === "localhost" || /(?:^|\.)(?:local|internal|test|example)$/.test(url.hostname) || /^(?:\d+\.){3}\d+$/.test(url.hostname)) return Response.json({ message: "Enter a public HTTPS website URL." }, { status: 400 });
    recent.push(now); attempts.set(ip, recent);
    const domain = url.hostname.toLowerCase().replace(/^www\./, "");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("site_listings").insert({ domain, url: url.toString(), title: parsed.data.title, description: parsed.data.description, category: parsed.data.category, owner_email: parsed.data.email });
      if (error?.code === "23505") return Response.json({ message: "This website has already been listed. Contact BharatKhoj if you need to update it." }, { status: 409 });
      if (error) throw error;
      return Response.json({ domain, title: parsed.data.title }, { status: 201 });
    } catch (error) {
      console.error("BharatKhoj submission failed", error);
      return Response.json({ message: "We couldn't save your website right now. Please try again later." }, { status: 500 });
    }
  },
} } });
