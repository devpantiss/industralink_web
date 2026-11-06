import type { PayPeriod } from "@/types";
import { getLang, t } from "./i18n";

const inr = new Intl.NumberFormat("en-IN");

export const formatNumber = (n: number) => inr.format(n);

export function formatCompact(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/** "₹18,000–22,000 / month" or "₹700 / day (about ₹18,200/month)". */
export function formatPay(min?: number, max?: number, period: PayPeriod = "month", withMonthly = false) {
  if (!min && !max) return t("Salary not disclosed");
  const range = min && max && min !== max ? `₹${inr.format(min)}–${inr.format(max)}` : `₹${inr.format((min || max)!)}`;
  const base = `${range} / ${t(period)}`;
  if (withMonthly && period === "day") {
    const monthly = Math.round(((min || max)! * 26) / 100) * 100;
    return `${base} (${t("about ₹{n}/month", { n: inr.format(monthly) })})`;
  }
  return base;
}

const loc = () => `${getLang()}-IN`;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(loc(), { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(loc(), {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function timeAgo(iso: string) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return diffSec > 0 ? t("in a moment") : t("just now");
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60], ["hour", 3600], ["day", 86400], ["week", 604800], ["month", 2629800], ["year", 31557600],
  ];
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  let size = 60;
  for (const [u, s] of steps) if (abs >= s) { unit = u; size = s; }
  const lang = getLang();
  const n = Math.round(diffSec / size);
  // Some phones/browsers have no built-in wording for a language (e.g. Odia), so use our own.
  if (lang !== "en" && !hasNativeWords(lang)) {
    if (unit === "day" && n === -1) return t("yesterday");
    return n < 0 ? t(`{n} ${unit}s ago`, { n: -n }) : t(`in {n} ${unit}s`, { n });
  }
  return rtfFor(lang).format(n, unit);
}

const nativeCache = new Map<string, boolean>();
/** True if the browser really writes "2 days ago" in this language (not just English letters). */
function hasNativeWords(lang: string) {
  if (!nativeCache.has(lang)) nativeCache.set(lang, !/[a-z]/i.test(rtfFor(lang).format(-2, "day")));
  return nativeCache.get(lang)!;
}

const rtfCache = new Map<string, Intl.RelativeTimeFormat>();
function rtfFor(lang: string) {
  if (!rtfCache.has(lang)) rtfCache.set(lang, new Intl.RelativeTimeFormat(lang, { numeric: "auto" }));
  return rtfCache.get(lang)!;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function greeting() {
  const h = new Date().getHours();
  return t(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
}
