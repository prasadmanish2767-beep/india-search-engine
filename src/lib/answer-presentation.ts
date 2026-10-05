const STOP_WORDS = new Set("who what when where why how is are was were the a an of in on to for and ka ki ke hai kya kab कौन क्या कब कहाँ कैसे है हैं के की का में".split(" "));

export function imageRelevance(query: string, title: string): number {
  const tokens = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => !STOP_WORDS.has(word)) ?? [];
  const normalized = title.toLocaleLowerCase();
  if (!tokens.length) return 0;
  return tokens.filter((word) => normalized.includes(word)).length / tokens.length;
}

export function answerHighlights(text: string, emphasizeLead = false): { text: string; highlighted: boolean }[] {
  const ranges: { start: number; end: number }[] = [];
  // Only emphasize literal content already present in the grounded answer.
  const datesAndValues = /\b(?:\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,4}[/-]\d{1,2}[/-]\d{2,4}|(?:19|20)\d{2}|\d[\d,.]*(?:\s*(?:billion|million|trillion|crore|lakh|percent|years?|days?))?%?)\b|[₹$€£]\s?\d[\d,.]*(?:\s*(?:billion|million|trillion|crore|lakh))?|[०-९]+(?:\s*(?:जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर))?(?:\s+[०-९]+)?/giu;
  for (const match of text.matchAll(datesAndValues)) ranges.push({ start: match.index, end: match.index + match[0].length });
  if (emphasizeLead) {
    const lead = text.split(/[.!?।\n]/u)[0]?.trim() ?? "";
    const direct = lead.split(/\s+(?:is|was|are|were|है|हैं)\s+/iu)[0]?.trim() ?? "";
    if (direct.length > 1 && direct.length <= 70 && direct.split(/\s+/).length <= 9) {
      const start = text.indexOf(direct);
      ranges.push({ start, end: start + direct.length });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  const parts: { text: string; highlighted: boolean }[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) parts.push({ text: text.slice(cursor, range.start), highlighted: false });
    parts.push({ text: text.slice(range.start, range.end), highlighted: true });
    cursor = range.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlighted: false });
  return parts;
}