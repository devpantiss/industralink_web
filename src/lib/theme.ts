/**
 * Light / dark mode. Light is the default; "system" follows the phone or computer.
 * Sets <html data-theme="light|dark">; colours live in styles/index.css.
 * index.html applies the saved choice before the app loads, so there is no flash.
 */
import { useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "industrialink.theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "system" ? v : "light";
  } catch {
    return "light";
  }
}

const resolve = (c: ThemeChoice): "light" | "dark" => (c === "system" ? (media().matches ? "dark" : "light") : c);

function apply() {
  const root = document.documentElement;
  const theme = resolve(getThemeChoice());
  if (root.dataset.theme === theme) return;
  // Switch every colour at once instead of letting each element fade.
  root.classList.add("theme-switching");
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#181B22" : "#FFFFFF");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
  listeners.forEach((fn) => fn());
}

export function setThemeChoice(c: ThemeChoice) {
  try { localStorage.setItem(KEY, c); } catch { /* ignore */ }
  apply();
  listeners.forEach((fn) => fn());
}

/** Call once at start-up. */
export function initTheme() {
  apply();
  media().addEventListener("change", () => getThemeChoice() === "system" && apply());
  window.addEventListener("storage", (e) => e.key === KEY && apply()); // other tabs
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

/** The saved choice (light / dark / system). */
export const useThemeChoice = () => useSyncExternalStore(subscribe, getThemeChoice, () => "light" as ThemeChoice);
/** What is showing right now. */
export const useTheme = () => useSyncExternalStore(subscribe, () => resolve(getThemeChoice()), () => "light" as const);
