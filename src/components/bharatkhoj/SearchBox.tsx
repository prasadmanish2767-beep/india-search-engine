import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, Mic, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SuggestionResponse = { suggestions?: string[] };
type SearchBoxProps = { initialQuery?: string; compact?: boolean; autoFocus?: boolean };

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function SearchBox({ initialQuery = "", compact = false, autoFocus = false }: SearchBoxProps) {
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setValue(initialQuery), [initialQuery]);
  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = (await response.json()) as SuggestionResponse;
        const next = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 6) : [];
        setSuggestions(next); setOpen(next.length > 0); setActive(-1);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") setSuggestions([]);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value]);

  const submit = (query = value) => {
    const clean = query.trim().slice(0, 200);
    if (!clean) return;
    setOpen(false);
    navigate({ to: "/search", search: { q: clean, page: 1 } });
  };

  const startVoice = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-IN"; recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) { setValue(transcript); submit(transcript); }
    };
    recognition.onerror = () => undefined;
    recognition.start();
  };

  return (
    <div className={cn("search-box-wrap", compact && "search-box-compact")}>
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Search className="search-leading" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setOpen(true); setActive((current) => Math.min(current + 1, suggestions.length - 1)); }
            if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setActive((current) => Math.max(current - 1, -1)); }
            if (event.key === "Enter" && active >= 0) { event.preventDefault(); submit(suggestions[active]); }
            if (event.key === "Escape") { setOpen(false); setActive(-1); }
          }}
          placeholder="Search BharatKhoj"
          aria-label="Search BharatKhoj"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={200}
        />
        {value && <Button type="button" variant="ghost" size="icon" onClick={() => { setValue(""); setOpen(false); }} aria-label="Clear search"><X /></Button>}
        <Button type="button" variant="ghost" size="icon" onClick={startVoice} aria-label="Search by voice"><Mic /></Button>
        <Button type="submit" size="icon" className="search-submit" aria-label="Search"><Search /></Button>
      </form>
      {open && (
        <ul id={listId} role="listbox" className="suggestions">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion} id={`${listId}-${index}`} role="option" aria-selected={active === index}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => submit(suggestion)}>
                <Clock3 aria-hidden="true" /><span>{suggestion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
