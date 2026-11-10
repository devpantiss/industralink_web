/**
 * Small translation layer for the worker side.
 *
 *   t("Find jobs")                      -> "ନିଯୁକ୍ତି ଖୋଜନ୍ତୁ" when Odia is on
 *   t("{n} open jobs", { n: 3 })        -> placeholders work in every language
 *
 * The English text is the key, so untranslated strings simply stay English.
 * Each language lives in ./locales/<code>.ts and is downloaded only when picked,
 * so the app stays small on slow phones. Employer and admin screens stay English.
 *
 * To add a language: copy locales/hi.ts, translate the values, add a row to LANGS.
 */
import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";

export type Lang = "en" | "hi" | "or";

/** Native name first, so people can find their own language without reading English. */
export const LANGS: { code: Lang; native: string; english: string; states: string; font?: string }[] = [
  { code: "hi", native: "हिंदी", english: "Hindi", states: "North & Central India", font: "Noto+Sans+Devanagari" },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia", states: "Odisha", font: "Noto+Sans+Oriya" },
  { code: "en", native: "English", english: "English", states: "" },
];

const loaders: Record<Exclude<Lang, "en">, () => Promise<{ default: Record<string, string> }>> = {
  hi: () => import("./locales/hi"),
  or: () => import("./locales/or"),
};

const KEY = "industrialink.lang";
const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);

/** A ?lang= from the landing site wins and is remembered; otherwise the saved choice. */
function read(): Lang {
  try {
    const fromLink = new URLSearchParams(window.location.search).get("lang");
    if (isLang(fromLink)) { localStorage.setItem(KEY, fromLink); return fromLink; }
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : "en";
  } catch { return "en"; }
}

let current: Lang = read();
let dict: Record<string, string> = {};
/** Translations only apply to workers and logged-out pages; HR and admin always see English. */
let scopeOn = true;
export function setLangScope(on: boolean) { scopeOn = on; }

/** The language actually shown right now. */
export const getLang = (): Lang => (scopeOn ? current : "en");

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = getLang() !== "en" ? dict[text] ?? text : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Loads the script's font from Google Fonts the first time a language is picked. */
function loadFont(l: Lang) {
  const font = LANGS.find((x) => x.code === l)?.font;
  if (!font || document.querySelector(`link[data-font="${font}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.font = font;
  link.href = `https://fonts.googleapis.com/css2?family=${font}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

async function load(l: Lang) {
  dict = l === "en" ? {} : (await loaders[l]()).default;
  current = l;
  document.documentElement.lang = l;
  if (l !== "en") loadFont(l);
}

/** Call once before the first render, so the saved language shows straight away. */
export async function initLang() {
  try { await load(current); } catch { current = "en"; dict = {}; }
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => Promise<void> }>({ lang: current, setLang: async () => undefined });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(current);
  const setLang = async (l: Lang) => {
    await load(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    setState(l);
  };
  // key = lang: the whole app re-renders once in the new language.
  return <Ctx.Provider value={{ lang, setLang }}><Fragment key={lang}>{children}</Fragment></Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** Language menu for the worker top bar and the login page. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const now = LANGS.find((l) => l.code === lang)!;
  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox" aria-label={`Language: ${now.english}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 text-small sm:px-3 font-semibold text-ink hover:bg-surface-muted">
        <Languages className="h-4 w-4 text-primary" aria-hidden />{now.native}<ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label="Choose language" className="glass-menu animate-pop absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-border py-1">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button role="option" aria-selected={lang === l.code} onClick={async () => { setOpen(false); await setLang(l.code); }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-muted ${lang === l.code ? "bg-primary-soft" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">{l.native}</span>
                  {l.code !== "en" && <span className="block truncate text-caption text-ink-muted">{l.english} · {l.states}</span>}
                </span>
                {lang === l.code && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
