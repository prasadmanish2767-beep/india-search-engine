import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
const schema = z.string().trim().min(2).max(200);
export const Route = createFileRoute("/api/suggestions")({ server: { handlers: { GET: async ({ request }) => {
  const parsed = schema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!parsed.success) return Response.json({ suggestions: [] }, { status: 400 });
  try { const { getSuggestions } = await import("@/lib/search.server"); return Response.json({ suggestions: await getSuggestions(parsed.data) }, { headers: { "Cache-Control": "private, max-age=30" } }); }
  catch (error) { console.error("BharatKhoj suggestion error", error); return Response.json({ suggestions: [] }, { status: 503 }); }
} } } });
