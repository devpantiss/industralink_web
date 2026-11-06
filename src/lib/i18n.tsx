/**
 * Tiny translation layer for the worker side.
 *
 *   t("Find jobs")                      -> "नौकरी खोजें" when Hindi is on
 *   t("{n} open jobs", { n: 3 })        -> placeholders work in both languages
 *
 * The English text is the key, so untranslated strings simply stay English.
 * Hindi strings live in ./hi.ts. Employer and admin screens stay English.
 */
import { createContext, Fragment, useContext, useState, type ReactNode } from "react";
import { HI } from "./hi";

export type Lang = "en" | "hi";
const KEY = "industrialink.lang";

function read(): Lang {
  try { return localStorage.getItem(KEY) === "hi" ? "hi" : "en"; } catch { return "en"; }
}

let current: Lang = read();
/** Hindi only applies to workers and logged-out pages; HR and admin always see English. */
let scopeOn = true;
export function setLangScope(on: boolean) { scopeOn = on; }

/** The language actually shown right now. */
export const getLang = (): Lang => (scopeOn ? current : "en");

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = getLang() === "hi" ? HI[text] ?? text : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: current, setLang: () => undefined });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(current);
  const setLang = (l: Lang) => {
    current = l;
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    document.documentElement.lang = l;
    setState(l);
  };
  // key = lang: the whole app re-renders once in the new language.
  return <Ctx.Provider value={{ lang, setLang }}><Fragment key={lang}>{children}</Fragment></Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** "हिं / EN" switch used in the worker top bar and on the login page. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="radiogroup" aria-label="Language / भाषा" className={`inline-flex rounded-full border border-border bg-surface p-0.5 text-small font-semibold ${className ?? ""}`}>
      {(["hi", "en"] as const).map((l) => (
        <button key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 transition-colors ${lang === l ? "bg-primary text-white" : "text-ink-secondary hover:text-ink"}`}>
          {l === "hi" ? "हिंदी" : "EN"}
        </button>
      ))}
    </div>
  );
}
