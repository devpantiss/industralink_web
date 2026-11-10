/**
 * What the landing site sends along with its links, so people don't type it twice.
 *
 *   ?lang=or                       app language (handled in i18n.tsx)
 *   ?name=&phone=&trade=&city=&state=   worker signup + onboarding
 *   ?company=&email=               employer signup
 *   ?draft={"title":..}            a job post the employer started on the landing page
 *   ?ref=hero-search               which landing section the visit came from
 *
 * Saved for this browser tab only, because the person may move from /jobs to
 * /signup to /welcome before the details are used.
 */
import type { JobInput, PayPeriod, Shift, Trade } from "@/types";

const KEY = "industrialink.handoff";
const TRADES: Trade[] = ["welder", "electrician", "fitter", "machine_operator", "driver", "crane_operator", "helper", "security", "supervisor", "other"];

export interface JobDraft {
  title?: string;
  trade?: Trade;
  city?: string;
  state?: string;
  openings?: number;
  payMin?: number;
  payMax?: number;
  payPeriod?: PayPeriod;
  shift?: Shift;
  foodStay?: boolean;
}

export interface Handoff {
  name?: string;
  phone?: string;
  trade?: Trade;
  city?: string;
  state?: string;
  company?: string;
  email?: string;
  ref?: string;
  draft?: JobDraft;
}

const text = (v: string | null, max = 80) => (v ? v.trim().slice(0, max) || undefined : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined);
const asTrade = (v: unknown) => (TRADES.includes(v as Trade) ? (v as Trade) : undefined);

function parseDraft(raw: string | null): JobDraft | undefined {
  if (!raw) return undefined;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    const s = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined);
    return {
      title: s(d.title), trade: asTrade(d.trade), city: s(d.city), state: s(d.state),
      openings: num(d.openings), payMin: num(d.payMin), payMax: num(d.payMax),
      payPeriod: d.payPeriod === "day" ? "day" : d.payPeriod === "month" ? "month" : undefined,
      shift: ["day", "night", "rotational"].includes(d.shift as string) ? (d.shift as Shift) : undefined,
      foodStay: d.foodStay === true,
    };
  } catch {
    return undefined;
  }
}

/** Call once at start-up: keeps anything the landing link carried. */
export function captureHandoff() {
  const sp = new URLSearchParams(window.location.search);
  const phone = sp.get("phone")?.replace(/\D/g, "").slice(-10);
  const incoming: Handoff = {
    name: text(sp.get("name")), phone: phone && /^[6-9]\d{9}$/.test(phone) ? phone : undefined,
    trade: asTrade(sp.get("trade")), city: text(sp.get("city")), state: text(sp.get("state")),
    company: text(sp.get("company")), email: text(sp.get("email"), 120), ref: text(sp.get("ref"), 40),
    draft: parseDraft(sp.get("draft")),
  };
  const found = Object.fromEntries(Object.entries(incoming).filter(([, v]) => v !== undefined));
  if (!Object.keys(found).length) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...getHandoff(), ...found })); } catch { /* ignore */ }
}

export function getHandoff(): Handoff {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Handoff; } catch { return {}; }
}

/** Forget one detail once it has been used (e.g. the job draft after saving it). */
export function clearHandoff(...keys: (keyof Handoff)[]) {
  const h = getHandoff();
  for (const k of keys) delete h[k];
  try { sessionStorage.setItem(KEY, JSON.stringify(h)); } catch { /* ignore */ }
}

/** The landing draft as Post Job form values. */
export function draftToJob(d: JobDraft): Partial<JobInput> {
  const out: Partial<JobInput> = {};
  if (d.title) out.title = d.title;
  if (d.trade) out.trade = d.trade;
  if (d.city) out.location = { city: d.city, state: d.state ?? "" };
  if (d.openings) out.openings = d.openings;
  if (d.payMin) out.payMin = d.payMin;
  if (d.payMax) out.payMax = d.payMax;
  if (d.payPeriod) out.payPeriod = d.payPeriod;
  if (d.shift) out.shift = d.shift;
  if (d.foodStay) out.benefits = ["food", "stay"];
  return out;
}
