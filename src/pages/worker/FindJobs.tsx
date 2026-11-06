import { useMemo, useState, type FormEvent } from "react";
import { t } from "@/lib/i18n";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import type { JobSearchParams, Sector, Shift, Trade } from "@/types";
import { SECTOR_LABEL, SHIFT_LABEL, TRADE_LABEL } from "@/lib/labels";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { Button, LinkButton } from "@/components/ui/Button";
import { Chip, Field, Input, Select } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Overlay";
import { PageHeader } from "@/components/ui/Misc";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";
import { cn } from "@/lib/cn";

const QUICK_TRADES: Trade[] = ["welder", "driver", "electrician", "fitter", "machine_operator", "crane_operator", "helper", "security"];
const PAY_OPTIONS = [0, 15000, 20000, 25000, 30000];

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

export default function FindJobs() {
  const { filters, update, clear } = useFilters();
  const [q, setQ] = useState(filters.q ?? "");
  const [city, setCity] = useState(filters.city ?? "");
  const [drawer, setDrawer] = useState(false);
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
  const { toggle, pendingId } = useSaveJob();

  const query = useInfiniteQuery({
    queryKey: qk.worker.jobs(filters),
    queryFn: ({ pageParam }) => workerApi.searchJobs({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;

  const advancedCount = [filters.trade, filters.sector, filters.shift, filters.minPay].filter(Boolean).length;
  const anyFilter = advancedCount > 0 || filters.q || filters.city || filters.foodStay || filters.walkInOnly || filters.verifiedOnly;
  const homeCity = profile.data?.location?.city;
  const nearMe = !!homeCity && filters.city === homeCity;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim(), city: city.trim() });
  };

  return (
    <div>
      <PageHeader title={t("Find jobs")} description={t("Verified industrial jobs. Pay shown on every job.")} actions={<LinkButton to="/worker/companies" variant="secondary" icon={<Building2 className="h-4 w-4" />}>{t("Browse companies")}</LinkButton>} />

      {/* Search */}
      <form onSubmit={submit} className="grid gap-2 rounded-lg border border-border bg-surface p-3 shadow-xs sm:grid-cols-[1fr_1fr_auto]" role="search">
        <label className="relative">
          <span className="sr-only">{t("Job or skill")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Job or skill, e.g. welder")} className="pl-10" inputSize="lg" />
        </label>
        <label className="relative">
          <span className="sr-only">{t("City")}</span>
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("City or state")} className="pl-10" inputSize="lg" />
        </label>
        <Button type="submit" size="lg">{t("Search")}</Button>
      </form>

      {/* Quick trade tiles */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {QUICK_TRADES.map((tr) => (
          <Chip key={tr} selected={filters.trade === tr} onClick={() => update({ trade: filters.trade === tr ? "" : tr })} className="shrink-0">{t(TRADE_LABEL[tr])}</Chip>
        ))}
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {homeCity && (
          <Chip selected={nearMe} icon={<MapPin className="h-3.5 w-3.5" aria-hidden />} onClick={() => { const v = nearMe ? "" : homeCity; setCity(v); update({ city: v }); }}>{t("Near me")}</Chip>
        )}
        <Chip selected={filters.foodStay} onClick={() => update({ foodStay: !filters.foodStay })}>{t("Food & Stay")}</Chip>
        <Chip selected={filters.walkInOnly} onClick={() => update({ walkInOnly: !filters.walkInOnly })}>{t("Walk-in")}</Chip>
        <Chip selected={filters.verifiedOnly} onClick={() => update({ verifiedOnly: !filters.verifiedOnly })}>{t("Verified only")}</Chip>
        <button onClick={() => setDrawer(true)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-small font-medium",
          advancedCount ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-ink-secondary hover:text-ink")}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> {t("More filters")}{advancedCount ? ` (${advancedCount})` : ""}
        </button>
        {anyFilter && (
          <button onClick={() => { clear(); setQ(""); setCity(""); }} className="inline-flex h-9 items-center gap-1 px-2 text-small font-medium text-ink-muted hover:text-ink">
            <X className="h-3.5 w-3.5" aria-hidden /> {t("Clear all")}
          </button>
        )}
      </div>

      {/* Results header */}
      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <p className="text-body text-ink-secondary" aria-live="polite">{query.isLoading ? t("Searching…") : t(total === 1 ? "{n} job" : "{n} jobs", { n: total })}</p>
        <label className="flex items-center gap-2 text-small text-ink-secondary">
          {t("Sort")}
          <Select value={filters.sort} onChange={(e) => update({ sort: e.target.value as JobSearchParams["sort"] })} className="h-9 w-auto">
            <option value="newest">{t("Newest")}</option>
            <option value="pay">{t("Highest pay")}</option>
            {homeCity && <option value="nearest">{t("Nearest")}</option>}
          </Select>
        </label>
      </div>

      {query.isLoading ? <ListSkeleton count={3} /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : items.length === 0 ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title={t("No jobs found")} description={t("Try removing some filters or searching a nearby city.")}
          action={<Button variant="secondary" onClick={() => { clear(); setQ(""); setCity(""); }}>{t("Clear filters")}</Button>} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />)}
          </div>
          {query.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage} loadingText={t("Loading…")}>{t("Load more jobs")}</Button>
            </div>
          )}
        </>
      )}

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t("More filters")}
        footer={<>
          <Button variant="ghost" onClick={() => update({ trade: "", sector: "", shift: "", minPay: 0 })}>{t("Reset")}</Button>
          <Button onClick={() => setDrawer(false)}>{t("Show {n} jobs", { n: total })}</Button>
        </>}>
        <div className="space-y-5">
          <Field label={t("Trade")}>{(id) => (
            <Select id={id} value={filters.trade} onChange={(e) => update({ trade: e.target.value as Trade })}>
              <option value="">{t("All trades")}</option>
              {(Object.keys(TRADE_LABEL) as Trade[]).map((tr) => <option key={tr} value={tr}>{t(TRADE_LABEL[tr])}</option>)}
            </Select>
          )}</Field>
          <Field label={t("Industry")}>{(id) => (
            <Select id={id} value={filters.sector} onChange={(e) => update({ sector: e.target.value as Sector })}>
              <option value="">{t("All industries")}</option>
              {(Object.keys(SECTOR_LABEL) as Sector[]).map((s) => <option key={s} value={s}>{t(SECTOR_LABEL[s])}</option>)}
            </Select>
          )}</Field>
          <Field label={t("Shift")}>{(id) => (
            <Select id={id} value={filters.shift} onChange={(e) => update({ shift: e.target.value as Shift })}>
              <option value="">{t("Any shift")}</option>
              {(["day", "night", "rotational"] as Shift[]).map((s) => <option key={s} value={s}>{t(SHIFT_LABEL[s])}</option>)}
            </Select>
          )}</Field>
          <div>
            <p className="text-small font-medium text-ink">{t("Minimum pay per month")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAY_OPTIONS.map((p) => (
                <Chip key={p} selected={(filters.minPay ?? 0) === p} onClick={() => update({ minPay: p })}>{p ? `₹${p / 1000}k+` : t("Any")}</Chip>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
