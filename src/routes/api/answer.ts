import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const cache = new Map<string, { expires: number; answer: string }>();
const Body = z.object({
  q: z.string().trim().min(2).max(200),
  sources: z.array(z.object({ title: z.string().max(300), snippet: z.string().max(400) })).min(1).max(6),
});

export const Route = createFileRoute("/api/answer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ answer: "" }, { status: 400 });
        const { q, sources } = parsed.data;
        const key = q.toLowerCase();
        const hit = cache.get(key);
        if (hit && hit.expires > Date.now()) return Response.json({ answer: hit.answer });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ answer: "" });
        const context = sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.snippet}`).join("\n");
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You answer search queries in 1-2 short sentences using ONLY the provided search results. Start with the direct answer (e.g. a name, number or fact). If the query is not a question or the results don't contain the answer, reply exactly: NONE. No markdown, no citations, never mention any search engine or provider." },
              { role: "user", content: `Query: ${q}\n\nSearch results:\n${context}` },
            ],
          }),
        });
        if (!res.ok) { console.error(`Answer failed [${res.status}]: ${await res.text()}`); return Response.json({ answer: "" }); }
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        let answer = (data.choices?.[0]?.message?.content ?? "").replace(/[*#`]/g, "").trim().slice(0, 400);
        if (/^NONE\.?$/i.test(answer)) answer = "";
        cache.set(key, { expires: Date.now() + 10 * 60_000, answer });
        return Response.json({ answer });
      },
    },
  },
});
