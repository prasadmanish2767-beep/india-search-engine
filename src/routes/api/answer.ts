import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

type AnswerData = { answer: string; facts: { text: string; sourceIndex: number }[]; imageIndex: number | null };
const empty: AnswerData = { answer: "", facts: [], imageIndex: null };
const cache = new Map<string, { expires: number; value: AnswerData }>();
const safeUrl = (value: string) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const Body = z.object({
  q: z.string().trim().min(2).max(200),
  sources: z.array(z.object({ title: z.string().max(300), snippet: z.string().max(400), url: z.string().max(2048).refine(safeUrl), image: z.string().max(2048).refine(safeUrl).optional() })).min(1).max(6),
});
const Output = z.object({
  answer: z.string().max(500),
  facts: z.array(z.object({ text: z.string().max(200), sourceIndex: z.number().int() })).max(4),
  imageIndex: z.number().int().nullable(),
});

export const Route = createFileRoute("/api/answer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json(empty, { status: 400 });
        const { q, sources } = parsed.data;
        const key = JSON.stringify([q.toLowerCase(), sources.map((s) => [s.url, s.snippet, s.image])]);
        const hit = cache.get(key);
        if (hit && hit.expires > Date.now()) return Response.json(hit.value);
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json(empty);
        const context = sources.map((s, i) => `[${i}] ${s.title}: ${s.snippet}${s.image ? " [source has image]" : ""}`).join("\n");
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: 'Use ONLY the supplied search results as evidence. Return ONLY valid JSON: {"answer":"one or two short sentences","facts":[{"text":"brief distinct fact","sourceIndex":0}],"imageIndex":null}. Begin the answer with the direct answer. Include 0–4 genuinely useful, non-repetitive facts supported by the cited result index; omit facts if evidence is weak. imageIndex may be an index only when the query is about a specific visible person, place, animal, object or event AND the result title and snippet establish that its image depicts that subject; otherwise null. Never invent an image or fact. If the results cannot answer the query, return an empty answer, empty facts and null imageIndex. No markdown, no provider names.' },
              { role: "user", content: `Query: ${q}\n\nSearch results:\n${context}` },
            ],
          }),
        });
        if (!res.ok) { console.error(`Answer failed [${res.status}]: ${await res.text()}`); return Response.json(empty); }
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        let raw: unknown;
        try { raw = JSON.parse((data.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim()); }
        catch { return Response.json(empty); }
        const output = Output.safeParse(raw);
        if (!output.success || !output.data.answer.trim()) return Response.json(empty);
        const value: AnswerData = {
          answer: output.data.answer.trim().slice(0, 400),
          facts: output.data.facts.filter((fact) => fact.text.trim() && sources[fact.sourceIndex]).map((fact) => ({ text: fact.text.trim(), sourceIndex: fact.sourceIndex })),
          imageIndex: output.data.imageIndex !== null && sources[output.data.imageIndex]?.image ? output.data.imageIndex : null,
        };
        cache.set(key, { expires: Date.now() + 10 * 60_000, value });
        return Response.json(value);
      },
    },
  },
});
