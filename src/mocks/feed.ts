/**
 * Public job feed for the landing site: /feed.json.
 *
 * Built from the demo seed when the app is built (see vite.config.ts), so the
 * landing page can show real openings and true counts. When the backend exists,
 * GET /public/feed should return this same shape.
 *
 * Only public facts go out: no HR phone, no company name (the demo seed uses
 * real-sounding names), no exact walk-in address.
 */
import type { Benefit, ExperienceBand, JobType, PayPeriod, Sector, Shift, Trade } from "@/types";
import type { MockDb } from "./seed";

export interface FeedJob {
  id: string;
  title: string;
  trade: Trade;
  sector: Sector;
  /** Generic, e.g. "Mining company". */
  employerType: string;
  verified: boolean;
  city: string;
  state: string;
  payMin?: number;
  payMax?: number;
  payPeriod: PayPeriod;
  shift: Shift;
  jobType: JobType;
  experience: ExperienceBand;
  openings: number;
  benefits: Benefit[];
  postedAt: string;
  deadline?: string;
  walkIn?: { date: string; time: string };
}

export interface Feed {
  version: 1;
  generatedAt: string;
  jobs: FeedJob[];
  totals: { jobs: number; openings: number; verifiedEmployers: number };
  bySector: Partial<Record<Sector, number>>;
  byTrade: Partial<Record<Trade, number>>;
  /** "Jharsuguda, Odisha" -> open jobs there. */
  byPlace: Record<string, number>;
}

const EMPLOYER_TYPE: Record<Sector, string> = {
  mining: "Mining company",
  metals: "Metals plant",
  shipping: "Port operator",
  petroleum: "Oil & gas contractor",
  logistics: "Logistics company",
  automotive: "Auto parts maker",
};

const bump = <K extends string>(m: Partial<Record<K, number>>, k: K) => { m[k] = (m[k] ?? 0) + 1; };

export function buildFeed(db: MockDb): Feed {
  const live = new Set(db.companies.filter((c) => c.status !== "blocked").map((c) => c.id));
  const jobs = db.jobs
    .filter((j) => j.status === "active" && !j.removedByAdmin && live.has(j.companyId) && !(j.deadline && new Date(j.deadline) < new Date()))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  const feed: Feed = {
    version: 1,
    generatedAt: new Date().toISOString(),
    jobs: jobs.map((j) => ({
      id: j.id, title: j.title, trade: j.trade, sector: j.sector, employerType: EMPLOYER_TYPE[j.sector], verified: j.companyVerified,
      city: j.location.city, state: j.location.state, payMin: j.payMin, payMax: j.payMax, payPeriod: j.payPeriod,
      shift: j.shift, jobType: j.jobType, experience: j.experience, openings: j.openings, benefits: j.benefits,
      postedAt: j.postedAt, deadline: j.deadline, walkIn: j.walkIn && { date: j.walkIn.date, time: j.walkIn.time },
    })),
    totals: {
      jobs: jobs.length,
      openings: jobs.reduce((n, j) => n + j.openings, 0),
      verifiedEmployers: db.companies.filter((c) => c.verification === "approved" && c.status === "active").length,
    },
    bySector: {},
    byTrade: {},
    byPlace: {},
  };
  for (const j of jobs) {
    bump(feed.bySector, j.sector);
    bump(feed.byTrade, j.trade);
    bump(feed.byPlace, `${j.location.city}, ${j.location.state}`);
  }
  return feed;
}
