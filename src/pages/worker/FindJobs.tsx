import { useEffect, useMemo, useState, type FormEvent } from "react";
import { t } from "@/lib/i18n";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, ChevronDown, MapPin, Mic, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { JobSearchParams, Sector, Shift, Trade } from "@/types";
import { SECTOR_LABEL, SHIFT_LABEL, TRADE_LABEL } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Overlay";
import { BannerArt } from "@/components/ui/Misc";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { JobRow } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

const QUICK_TRADES: Trade[] = ["welder", "driver", "electrician", "fitter", "machine_operator", "crane_operator", "helper", "security"];
const PAY_MAX = 40000;

/** All filters live in the URL, so a search can be shared or bookmarked. */
function useFilters() {
  const [sp, setSp] = useSearchParams();
  const filters: JobSearchParams = {
    q: sp.get("q") ?? "",
    city: sp.get("city") ?? "",
    trade: (sp.get("trade") as Trade) ?? "",
    sector: (sp.get("sector") as Sector) ?? "",
    shift: (sp.get("shift") as Shift) ?? "",
    minPay: Number(sp.get("minPay") ?? 0) || undefined,
    foodStay: sp.get("foodStay") === "true",
    walkInOnly: sp.get("walkInOnly") === "true",
    verifiedOnly: sp.get("verifiedOnly") === "true",
    sort: (sp.get("sort") as JobSearchParams["sort"]) ?? "newest",
  };
  const update = (changes: Partial<JobSearchParams>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === "" || v === false || v === 0) next.delete(k);
      else next.set(k, String(v));
    }
    setSp(next, { replace: true });
  };
  const clear = () => setSp(new URLSearchParams(), { replace: true });
  return { filters, update, clear };
}

type Filters = ReturnType<typeof useFilters>;

export default function FindJobs() {
  const f = useFilters();
  const { filters, update, clear } = f;
  const [q, setQ] = useState(filters.q ?? "");
  const [city, setCity] = useState(filters.city ?? "");
  const [drawer, setDrawer] = useState(false);
  const toast = useToast();
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
  const { toggle, pendingId } = useSaveJob();
  const voice = useVoiceSearch((text) => { setQ(text); update({ q: text }); }, (msg) => toast.error(t(msg)));

  // Keep the boxes in step when the URL changes (e.g. "Clear all", or a link from the dashboard).
  useEffect(() => { setQ(filters.q ?? ""); setCity(filters.city ?? ""); }, [filters.q, filters.city]);

  const query = useInfiniteQuery({
    queryKey: qk.worker.jobs(filters),
    queryFn: ({ pageParam }) => workerApi.searchJobs({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;
  const homeCity = profile.data?.location?.city;
  const activeCount = [filters.trade, filters.sector, filters.shift, filters.minPay, filters.foodStay, filters.walkInOnly, filters.verifiedOnly, filters.city].filter(Boolean).length;

  const submit = (e: FormEvent) => { e.preventDefault(); update({ q: q.trim(), city: city.trim() }); };
  const clearAll = () => { clear(); setQ(""); setCity(""); };

  return (
    <div>
      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-muted px-6 pb-20 pt-8 sm:px-10 sm:pb-24 sm:pt-11">
        <BannerArt className="w-[95%] opacity-[.14] md:w-[54%] md:opacity-100" />
        <div className="relative max-w-[520px]">
          <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[42px]">{t("Find work near you")}</h1>
          <p className="mt-2.5 max-w-[46ch] text-body-lg text-ink-secondary">{t("Verified jobs from plants, ports, mines and transport companies. Apply with your profile, no resume needed.")}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-small font-semibold text-ink-secondary">
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary" aria-hidden />{t("Verified employers")}</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />{t("Always free for workers")}</span>
            <Link to="/worker/companies" className="inline-flex items-center gap-1.5 text-primary hover:underline"><Building2 className="h-4 w-4" aria-hidden />{t("Browse companies")}</Link>
          </div>
        </div>
      </section>

      {/* Search bar, overlapping the banner */}
      <form onSubmit={submit} role="search" className="relative z-10 mx-3 -mt-11 flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-2 shadow-md sm:mx-7 sm:flex-row sm:items-center">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 px-3 text-ink-muted">
          <Search className="h-5 w-5 shrink-0" aria-hidden />
          <span className="sr-only">{t("Job or skill")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Job title, trade or company")} className="min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-muted" />
          <button type="button" onClick={voice.start} aria-label={voice.listening ? t("Stop listening") : t("Search by voice")} aria-pressed={voice.listening}
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors", voice.listening ? "bg-danger-fg text-white" : "text-ink-secondary hover:bg-surface-muted")}>
            <Mic className={cn("h-4 w-4", voice.listening && "animate-pulse")} aria-hidden />
          </button>
        </label>
        <span className="hidden h-8 w-px bg-border sm:block" aria-hidden />
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 border-t border-border px-3 text-ink-muted sm:border-0">
          <MapPin className="h-5 w-5 shrink-0" aria-hidden />
          <span className="sr-only">{t("City")}</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("City or state")} className="min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-muted" />
          {homeCity && city !== homeCity && (
            <button type="button" onClick={() => { setCity(homeCity); update({ city: homeCity }); }} className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-caption font-semibold text-primary hover:bg-primary-soft/70">{t("Near me")}</button>
          )}
        </label>
        <Button type="submit" size="lg" className="h-12 px-7">{t("Find jobs")}</Button>
      </form>

      {/* Quick trade picks */}
      <div className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK_TRADES.map((tr) => (
          <button key={tr} type="button" onClick={() => update({ trade: filters.trade === tr ? "" : tr })} aria-pressed={filters.trade === tr}
            className={cn("h-9 shrink-0 rounded-full border px-4 text-small font-semibold transition-colors",
              filters.trade === tr ? "border-ink bg-ink text-white" : "border-border bg-surface text-ink-secondary hover:border-border-strong hover:text-ink")}>
            {t(TRADE_LABEL[tr])}
          </button>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24 lg:block" aria-label={t("Filter")}>
          <FilterPanel f={f} homeCity={homeCity} onClear={clearAll} />
        </aside>

        <section aria-label={t("Results")}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-lg font-bold text-ink" aria-live="polite">{query.isLoading ? t("Searching…") : t(total === 1 ? "{n} job found" : "{n} jobs found", { n: total })}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="h-10 lg:hidden" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setDrawer(true)}>
                {t("Filters")}{activeCount ? ` (${activeCount})` : ""}
              </Button>
              <label className="relative">
                <span className="sr-only">{t("Sort")}</span>
                <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as JobSearchParams["sort"] })}
                  className="h-10 appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 text-small font-semibold text-ink hover:border-border-strong focus:border-primary focus:outline-none">
                  <option value="newest">{t("Newest first")}</option>
                  <option value="pay">{t("Highest pay")}</option>
                  {homeCity && <option value="nearest">{t("Nearest")}</option>}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              </label>
            </div>
          </div>

          {query.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[150px] rounded-lg" />)}</div>
          ) : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : items.length === 0 ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title={t("No jobs found")} description={t("Try removing some filters or searching a nearby city.")}
              action={<Button variant="secondary" onClick={clearAll}>{t("Clear filters")}</Button>} />
          ) : (
            <>
              <div className="space-y-3">
                {items.map((j) => <div key={j.id} className="animate-rise"><JobRow job={j} onToggleSave={toggle} saving={pendingId === j.id} /></div>)}
              </div>
              {query.hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button variant="secondary" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage} loadingText={t("Loading…")}>{t("Load more jobs")}</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t("Filter")}
        footer={<Button className="w-full" onClick={() => setDrawer(false)}>{t("Show {n} jobs", { n: total })}</Button>}>
        <FilterPanel f={f} homeCity={homeCity} onClear={clearAll} />
      </Drawer>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-4 last:border-0 last:pb-0">
      <legend className="mb-2.5 float-left w-full text-small font-bold text-ink">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Opt({ type, name, checked, onChange, label }: { type: "radio" | "checkbox"; name: string; checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-small text-ink-secondary hover:text-ink">
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-4 w-4 shrink-0" />
      <span className={cn(checked && "font-semibold text-ink")}>{label}</span>
    </label>
  );
}

function FilterPanel({ f, homeCity, onClear }: { f: Filters; homeCity?: string; onClear: () => void }) {
  const { filters, update } = f;
  const [pay, setPay] = useState(filters.minPay ?? 0);
  useEffect(() => setPay(filters.minPay ?? 0), [filters.minPay]);
  const pct = (pay / PAY_MAX) * 100;
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-body-lg font-bold text-ink">{t("Filter")}</h2>
        <button type="button" onClick={onClear} className="text-small font-semibold text-danger-fg hover:underline">{t("Clear all")}</button>
      </div>

      <Group title={t("Location")}>
        <Opt type="checkbox" name="near" checked={!!homeCity && filters.city === homeCity} onChange={() => update({ city: filters.city === homeCity ? "" : homeCity })}
          label={homeCity ? t("Near me ({city})", { city: homeCity }) : t("Near me")} />
      </Group>

      <Group title={t("Job type")}>
        <Opt type="checkbox" name="walkin" checked={!!filters.walkInOnly} onChange={() => update({ walkInOnly: !filters.walkInOnly })} label={t("Walk-in interview")} />
        <Opt type="checkbox" name="verified" checked={!!filters.verifiedOnly} onChange={() => update({ verifiedOnly: !filters.verifiedOnly })} label={t("Verified companies only")} />
        <Opt type="checkbox" name="foodstay" checked={!!filters.foodStay} onChange={() => update({ foodStay: !filters.foodStay })} label={t("Food & stay given")} />
      </Group>

      <Group title={t("Minimum pay per month")}>
        <div className="grid grid-cols-2 gap-x-2">
          {[0, 15000, 20000, 25000].map((p) => (
            <Opt key={p} type="radio" name="minpay" checked={(filters.minPay ?? 0) === p} onChange={() => update({ minPay: p })} label={p ? `₹${p / 1000}k+` : t("Any")} />
          ))}
        </div>
        <div className="mt-3">
          <input type="range" min={0} max={PAY_MAX} step={1000} value={pay} aria-label={t("Minimum pay per month")}
            onChange={(e) => setPay(Number(e.target.value))} onPointerUp={() => update({ minPay: pay })} onKeyUp={() => update({ minPay: pay })} onBlur={() => pay !== (filters.minPay ?? 0) && update({ minPay: pay })}
            className="range h-2 w-full cursor-pointer rounded-full"
            style={{ background: `linear-gradient(to right, rgb(var(--primary)) ${pct}%, rgb(var(--border)) ${pct}%)` }} />
          <div className="mt-1.5 flex justify-between text-caption font-semibold text-ink-secondary"><span>{pay ? `₹${formatNumber(pay)}+` : t("Any")}</span><span>₹{formatNumber(PAY_MAX)}</span></div>
        </div>
      </Group>

      <Group title={t("Shift")}>
        <div className="grid grid-cols-2 gap-x-2">
          <Opt type="radio" name="shift" checked={!filters.shift} onChange={() => update({ shift: "" })} label={t("Any")} />
          {(["day", "night", "rotational"] as Shift[]).map((s) => (
            <Opt key={s} type="radio" name="shift" checked={filters.shift === s} onChange={() => update({ shift: s })} label={t(SHIFT_LABEL[s]).replace(/ shift$/i, "")} />
          ))}
        </div>
      </Group>

      <Group title={t("Industry")}>
        <Opt type="radio" name="sector" checked={!filters.sector} onChange={() => update({ sector: "" })} label={t("All industries")} />
        {(Object.keys(SECTOR_LABEL) as Sector[]).map((s) => (
          <Opt key={s} type="radio" name="sector" checked={filters.sector === s} onChange={() => update({ sector: s })} label={t(SECTOR_LABEL[s])} />
        ))}
      </Group>

      <Group title={t("Trade")}>
        <div className="relative">
          <select value={filters.trade} onChange={(e) => update({ trade: e.target.value as Trade })} aria-label={t("Trade")}
            className="h-10 w-full appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 text-small text-ink hover:border-border-strong focus:border-primary focus:outline-none">
            <option value="">{t("All trades")}</option>
            {(Object.keys(TRADE_LABEL) as Trade[]).map((tr) => <option key={tr} value={tr}>{t(TRADE_LABEL[tr])}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        </div>
      </Group>
    </div>
  );
}
