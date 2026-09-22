import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, Mic, Search, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSuggestions, pushHistory, readHistory, removeHistory } from "@/lib/suggest";

type SearchBoxProps = { initialQuery?: string; compact?: boolean; autoFocus?: boolean };
type Item = { text: string; recent: boolean };

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, index)}
      <strong>{text.slice(index, index + query.length)}</strong>
      {text.slice(index + query.length)}
    </span>
  );
}

export function SearchBox({ initialQuery = "", compact = false, autoFocus = false }: SearchBoxProps) {
  const [value, setValue] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const listId = useId();

  useEffect(() => setValue(initialQuery), [initialQuery]);
  useEffect(() => setHistory(readHistory()), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 160);
    return () => window.clearTimeout(timer);
  }, [value]);

  const items = useMemo<Item[]>(() => {
    const query = debounced.trim();
    const recent = history
      .filter((item) => !query || item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map((text) => ({ text, recent: true }));
    if (query.length < 2) return recent;
    const seen = new Set(recent.map((item) => item.text.toLowerCase()));
    const generated = buildSuggestions(query, 8)
      .filter((text) => !seen.has(text.toLowerCase()))
      .map((text) => ({ text, recent: false }));
    return [...recent, ...generated].slice(0, 8);
  }, [debounced, history]);

  useEffect(() => setActive(-1), [debounced]);

  const submit = (query = value) => {
    const clean = query.trim().slice(0, 200);
    if (!clean) return;
    setOpen(false);
    setValue(clean);
    setHistory(pushHistory(clean));
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

  const showList = open && items.length > 0;

  return (
    <div className={cn("search-box-wrap", compact && "search-box-compact")}>
      <form className="search-box" role="search" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <Search className="search-leading" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => { setValue(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && items.length) { event.preventDefault(); setOpen(true); setActive((current) => Math.min(current + 1, items.length - 1)); }
            if (event.key === "ArrowUp" && items.length) { event.preventDefault(); setActive((current) => Math.max(current - 1, -1)); }
            if (event.key === "Enter" && active >= 0) { event.preventDefault(); submit(items[active].text); }
            if (event.key === "Escape") { setOpen(false); setActive(-1); }
          }}
          placeholder="Search BharatKhoj"
          aria-label="Search BharatKhoj"
          aria-controls={showList ? listId : undefined}
          aria-expanded={showList}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={200}
        />
        {value && <Button type="button" variant="ghost" size="icon" onClick={() => { setValue(""); setOpen(false); }} aria-label="Clear search"><X /></Button>}
        <Button type="button" variant="ghost" size="icon" onClick={startVoice} aria-label="Search by voice"><Mic /></Button>
        <Button type="submit" size="icon" className="search-submit" aria-label="Search"><Search /></Button>
      </form>
      {showList && (
        <ul id={listId} role="listbox" className="suggestions">
          {items.map((item, index) => (
            <li key={`${item.recent ? "r" : "s"}-${item.text}`} id={`${listId}-${index}`} role="option" aria-selected={active === index}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => submit(item.text)}>
                {item.recent ? <Clock3 aria-hidden="true" /> : <TrendingUp aria-hidden="true" />}
                <Highlight text={item.text} query={debounced.trim()} />
              </button>
              {item.recent && (
                <button
                  type="button"
                  className="suggestion-remove"
                  aria-label={`Remove ${item.text} from recent searches`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setHistory(removeHistory(item.text))}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
