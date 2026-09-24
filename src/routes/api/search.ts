import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
const schema = z.object({ q: z.string().trim().min(1).max(200), page: z.coerce.number().int().min(1).max(100).default(1), pageSize: z.coerce.number().int().min(1).max(20).default(10), fresh: z.enum(["1"]).optional(), vertical: z.enum(["web", "images", "news", "videos"]).default("web"), debug: z.enum(["1"]).optional() });
export const Route = createFileRoute("/api/search")({ server: { handlers: { GET: async ({ request }) => {
  const url = new URL(request.url); const parsed = schema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: "invalid_query", message: "Enter a search query between 1 and 200 characters." }, { status: 400 });
  try { const { searchWeb } = await import("@/lib/search.server"); return Response.json(await searchWeb(parsed.data.q, parsed.data.page, parsed.data.pageSize, parsed.data.fresh === "1", parsed.data.vertical, parsed.data.debug === "1"), { headers: { "Cache-Control": "private, max-age=30" } }); }
  catch (error) { console.error("BharatKhoj search error", error); return Response.json({ error: "server_error", message: "Search is temporarily unavailable." }, { status: 500 }); }
} } } });
