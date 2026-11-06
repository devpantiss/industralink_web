import type { PayPeriod } from "@/types";

const inr = new Intl.NumberFormat("en-IN");

export const formatNumber = (n: number) => inr.format(n);

export function formatCompact(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/** "₹18,000–22,000 / month" or "₹700 / day (about ₹18,200/month)". */
export function formatPay(min?: number, max?: number, period: PayPeriod = "month", withMonthly = false) {
  if (!min && !max) return "Salary not disclosed";
  const range = min && max && min !== max ? `₹${inr.format(min)}–${inr.format(max)}` : `₹${inr.format((min || max)!)}`;
  const base = `${range} / ${period}`;
  if (withMonthly && period === "day") {
    const monthly = Math.round(((min || max)! * 26) / 100) * 100;
    return `${base} (about ₹${inr.format(monthly)}/month)`;
  }
  return base;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function timeAgo(iso: string) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return diffSec > 0 ? "in a moment" : "just now";
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60], ["hour", 3600], ["day", 86400], ["week", 604800], ["month", 2629800], ["year", 31557600],
  ];
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  let size = 60;
  for (const [u, s] of steps) if (abs >= s) { unit = u; size = s; }
  return rtf.format(Math.round(diffSec / size), unit);
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

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
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
