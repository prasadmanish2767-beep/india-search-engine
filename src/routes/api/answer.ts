import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

type AnswerData = { answer: string; facts: { text: string; sourceIndex: number }[]; imageIndex: number | null; imageQuery: string | null };
const empty: AnswerData = { answer: "", facts: [], imageIndex: null, imageQuery: null };
const cache = new Map<string, { expires: number; value: AnswerData }>();
const safeUrl = (value: string) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};
const Body = z.object({
  q: z.string().trim().min(2).max(200),
  sources: z.array(z.object({ title: z.string().max(300), snippet: z.string().max(400), url: z.string().max(2048).refine(safeUrl), image: z.string().max(2048).refine(safeUrl).optional() })).min(1).max(6),
});
const Output = z.object({
  answer: z.string().max(900),
  facts: z.array(z.object({ text: z.string().max(200), sourceIndex: z.number().int() })).max(4),
  imageIndex: z.number().int().nullable(),
  imageQuery: z.string().max(80).nullable(),
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
        const value = (await aiAnswer(q, sources)) ?? (await freeAnswer(q, sources));
        if (value) cache.set(key, { expires: Date.now() + 10 * 60_000, value });
        return Response.json(value ?? empty);
      },
    },
  },
});

async function freeAnswer(q: string, sources: z.infer<typeof Body>["sources"]): Promise<AnswerData | null> {
  const { freeInstantAnswer } = await import("@/lib/free-sources.server");
  const free = await freeInstantAnswer(q);
  if (!free) return null;
  const idx = sources.findIndex((s) => s.url === free.url);
  const sentences = free.answer.match(/[^.!?]+[.!?]+/g) ?? [free.answer];
  return {
    answer: sentences.slice(0, 4).join(" ").trim().slice(0, 800),
    facts: idx >= 0 ? sentences.slice(4, 7).map((t) => ({ text: t.trim().slice(0, 200), sourceIndex: idx })).filter((f) => f.text) : [],
    imageIndex: null,
    imageQuery: free.image ? q : null,
  };
}

async function aiAnswer(q: string, sources: z.infer<typeof Body>["sources"]): Promise<AnswerData | null> {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return null;
        const context = sources.map((s, i) => `[${i}] ${s.title}: ${s.snippet}${s.image ? " [source has image]" : ""}`).join("\n");
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: 'Use ONLY the supplied search results as evidence. Return ONLY valid JSON: {"answer":"a clear 3-4 sentence overview explaining the topic","facts":[{"text":"brief distinct fact","sourceIndex":0}],"imageIndex":null,"imageQuery":null}. Begin the answer with the direct answer. Always answer any question or topic the results describe, like a search engine overview. Include 2–4 genuinely useful, non-repetitive facts supported by the cited result index; omit facts if evidence is weak. For a query about a specific visible person, place, animal or object, set imageIndex to a supplied image index ONLY if the result title and snippet establish that the image depicts the exact subject. If no suitable supplied image exists, set imageQuery to the short exact subject name mentioned in the answer; otherwise set both image fields to null. Images are NOT useful for abstract concepts, how-to, definitions or time-sensitive events. Never invent a fact or subject. If the results cannot answer the query, return an empty answer, empty facts and null image fields. No markdown, no provider names.' },
              { role: "user", content: `Query: ${q}\n\nSearch results:\n${context}` },
            ],
          }),
        });
        if (!res.ok) { console.error(`Answer failed [${res.status}]: ${await res.text()}`); return null; }
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        let raw: unknown;
        try { raw = JSON.parse((data.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim()); }
        catch { return null; }
        const output = Output.safeParse(raw);
        if (!output.success || !output.data.answer.trim()) return null;
        const result: AnswerData = {
          answer: output.data.answer.trim().slice(0, 800),
          facts: output.data.facts.filter((fact) => fact.text.trim() && sources[fact.sourceIndex]).map((fact) => ({ text: fact.text.trim(), sourceIndex: fact.sourceIndex })),
          imageIndex: output.data.imageIndex !== null && sources[output.data.imageIndex]?.image ? output.data.imageIndex : null,
          imageQuery: output.data.imageQuery && output.data.answer.toLowerCase().includes(output.data.imageQuery.trim().toLowerCase()) ? output.data.imageQuery.trim() : null,
        };
        return result;
}
