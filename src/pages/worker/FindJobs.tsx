import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import type { JobSearchParams, Sector, Shift, Trade } from "@/types";
import { SECTOR_LABEL, SHIFT_LABEL, TRADE_LABEL } from "@/lib/labels";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { useSaveJob } from "@/hooks/useSaveJob";
import { JobDetailView } from "./JobDetail";
import { cn } from "@/lib/cn";

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

function PillSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const active = !!value;
  const shown = options.find((o) => o.value === value && o.value)?.label ?? label;
  return (
    <label className={cn("relative inline-flex h-9 shrink-0 items-center rounded-full border pl-3.5 pr-8 text-small font-semibold transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
      active ? "border-primary bg-primary text-white" : "border-border-strong bg-surface text-ink hover:bg-surface-muted")}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span aria-hidden>{shown}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4" aria-hidden />
    </label>
  );
}

function ToggleChip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!on}
      className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-small font-semibold transition-colors",
        on ? "border-primary bg-primary text-white" : "border-border-strong bg-surface text-ink hover:bg-surface-muted")}>
      {on && <Check className="h-3.5 w-3.5" aria-hidden />}{children}
    </button>
  );
}

export default function FindJobs() {
  const { filters, update, clear } = useFilters();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");
  const [city, setCity] = useState(filters.city ?? "");
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

  // Selected job for the side pane (wide screens). Kept in the URL like Indeed's ?vjk=.
  const selectedId = sp.get("jk") && items.some((j) => j.id === sp.get("jk")) ? sp.get("jk")! : items[0]?.id;
  const select = (id: string) => { const n = new URLSearchParams(sp); n.set("jk", id); n.delete("apply"); setSp(n, { replace: true }); };

  const anyFilter = filters.trade || filters.sector || filters.shift || filters.minPay || filters.q || filters.city || filters.foodStay || filters.walkInOnly || filters.verifiedOnly;
  const homeCity = profile.data?.location?.city;
  const nearMe = !!homeCity && filters.city === homeCity;
  const reset = () => { clear(); setQ(""); setCity(""); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim(), city: city.trim() });
  };

  const heading = [filters.trade ? TRADE_LABEL[filters.trade as Trade] : filters.q || "", "jobs", filters.city ? `in ${filters.city}` : ""].filter(Boolean).join(" ");

  return (
    <div>
      {/* One search bar: What + Where, like Indeed */}
      <form onSubmit={submit} role="search"
        className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-[0_2px_8px_rgb(0_0_0/.06)] sm:flex-row sm:items-center sm:rounded-full sm:p-1.5">
        <label className="relative flex flex-1 items-center">
          <span className="sr-only">Job title or skill</span>
          <Search className="pointer-events-none absolute left-4 h-5 w-5 text-ink" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title or skill, e.g. welder"
            className="h-12 w-full bg-transparent pl-12 pr-3 text-body-lg text-ink placeholder:text-ink-muted focus:outline-none" />
        </label>
        <span className="mx-4 h-px bg-border sm:mx-0 sm:h-7 sm:w-px" aria-hidden />
        <label className="relative flex flex-1 items-center">
          <span className="sr-only">City or state</span>
          <MapPin className="pointer-events-none absolute left-4 h-5 w-5 text-ink" aria-hidden />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or state"
            className="h-12 w-full bg-transparent pl-12 pr-3 text-body-lg text-ink placeholder:text-ink-muted focus:outline-none" />
        </label>
        <div className="p-2 sm:p-0"><Button type="submit" size="lg" className="w-full sm:w-auto">Find jobs</Button></div>
      </form>

      {/* Filter pills */}
      <div className="no-scrollbar -mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {homeCity && <ToggleChip on={nearMe} onClick={() => { const v = nearMe ? "" : homeCity; setCity(v); update({ city: v }); }}>Near me</ToggleChip>}
        <PillSelect label="Trade" value={filters.trade ?? ""} onChange={(v) => update({ trade: v as Trade })}
          options={[{ value: "", label: "Any trade" }, ...(Object.keys(TRADE_LABEL) as Trade[]).map((t) => ({ value: t, label: TRADE_LABEL[t] }))]} />
        <PillSelect label="Pay" value={filters.minPay ? String(filters.minPay) : ""} onChange={(v) => update({ minPay: Number(v) })}
          options={PAY_OPTIONS.map((p) => ({ value: p ? String(p) : "", label: p ? `₹${p / 1000}k+ / month` : "Any pay" }))} />
        <PillSelect label="Shift" value={filters.shift ?? ""} onChange={(v) => update({ shift: v as Shift })}
          options={[{ value: "", label: "Any shift" }, ...(["day", "night", "rotational"] as Shift[]).map((x) => ({ value: x, label: SHIFT_LABEL[x] }))]} />
        <PillSelect label="Industry" value={filters.sector ?? ""} onChange={(v) => update({ sector: v as Sector })}
          options={[{ value: "", label: "Any industry" }, ...(Object.keys(SECTOR_LABEL) as Sector[]).map((x) => ({ value: x, label: SECTOR_LABEL[x] }))]} />
        <ToggleChip on={filters.foodStay} onClick={() => update({ foodStay: !filters.foodStay })}>Food & Stay</ToggleChip>
        <ToggleChip on={filters.walkInOnly} onClick={() => update({ walkInOnly: !filters.walkInOnly })}>Walk-in</ToggleChip>
        <ToggleChip on={filters.verifiedOnly} onClick={() => update({ verifiedOnly: !filters.verifiedOnly })}>Verified only</ToggleChip>
        {anyFilter && (
          <button onClick={reset} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-small font-semibold text-primary hover:underline">
            <X className="h-3.5 w-3.5" aria-hidden /> Clear all
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        {/* Results header */}
        <div className="mb-3 flex items-end justify-between gap-3 lg:max-w-[440px]">
          <div>
            <h1 className="text-h2 first-letter:uppercase text-ink">{heading === "jobs" ? "Jobs for you" : heading}</h1>
            <p className="text-small text-ink-secondary" aria-live="polite">{query.isLoading ? "Searching…" : `${total} job${total === 1 ? "" : "s"} · verified companies, pay shown`}</p>
          </div>
          <label className="flex items-center gap-1.5 text-small text-ink-secondary">
            Sort
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as JobSearchParams["sort"] })}
              className="h-8 rounded-md border-0 bg-transparent pr-6 text-small font-semibold text-ink focus:ring-2 focus:ring-primary">
              <option value="newest">Newest</option>
              <option value="pay">Highest pay</option>
              {homeCity && <option value="nearest">Nearest</option>}
            </select>
          </label>
        </div>

        {query.isLoading ? <div className="lg:max-w-[440px]"><ListSkeleton count={3} /></div> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : items.length === 0 ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="No jobs found" description="Try removing some filters or searching a nearby city."
            action={<Button variant="secondary" onClick={reset}>Clear filters</Button>} />
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-5">
            <div>
              <div className="space-y-3">
                {items.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} onSelect={select} selected={j.id === selectedId} />)}
              </div>
              {query.hasNextPage && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage} loadingText="Loading…">Load more jobs</Button>
                </div>
              )}
            </div>
            <aside className="sticky top-[84px] hidden max-h-[calc(100vh-100px)] overflow-y-auto rounded-lg border border-border bg-surface lg:block" aria-label="Selected job">
              {selectedId && <div key={selectedId} className="animate-page"><JobDetailView id={selectedId} embedded /></div>}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
