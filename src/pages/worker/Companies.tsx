import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, MapPin, Search, Users } from "lucide-react";
import type { Sector } from "@/types";
import { companiesApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { SECTOR_LABEL } from "@/lib/labels";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/Misc";
import { VerifiedTick } from "@/components/ui/Badge";
import { Chip, Input } from "@/components/ui/Field";
import { EmptyState, QueryState } from "@/components/ui/States";
import { SECTOR_ICON, SECTOR_TINT } from "@/components/domain/JobBits";

/** All verified companies, so workers can look up an employer before applying. */
export default function Companies() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const params = { q: q.trim() || undefined, sector };
  const list = useQuery({ queryKey: qk.companies(params), queryFn: () => companiesApi.list(params) });

  return (
    <div>
      <PageHeader breadcrumb={{ label: t("Find jobs"), to: "/worker/jobs" }} title={t("Companies")} description={t("Every company here is checked by our team.")} />
      <label className="relative mb-3 block sm:max-w-md">
        <span className="sr-only">{t("Search companies")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Company name or city")} className="pl-10" inputSize="lg" />
      </label>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={!sector} onClick={() => setSector("")} className="shrink-0">{t("All")}</Chip>
        {(Object.keys(SECTOR_LABEL) as Sector[]).map((s) => <Chip key={s} selected={sector === s} onClick={() => setSector(sector === s ? "" : s)} className="shrink-0">{t(SECTOR_LABEL[s])}</Chip>)}
      </div>
      <QueryState query={list} empty={(d) => d.length === 0 && <EmptyState icon={<Building2 className="h-6 w-6" />} title={t("No companies found")} description={t("Try another name or industry.")} />}>
        {(rows) => (
          <ul className="stagger grid gap-3 md:grid-cols-2">
            {rows.map(({ company: c, openJobs }) => {
              const Icon = SECTOR_ICON[c.sector];
              return (
                <li key={c.id}>
                  <Link to={`/worker/companies/${c.id}`} className="flex h-full items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-xs transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", SECTOR_TINT[c.sector])}><Icon className="h-6 w-6" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-h3 text-ink"><span className="truncate">{c.name}</span> <VerifiedTick verified /></p>
                      <p className="truncate text-small text-ink-secondary">{t(SECTOR_LABEL[c.sector])}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-caption text-ink-muted">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{c.location.city || "—"}</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{c.size}</span>
                      </p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold", openJobs ? "bg-primary-soft text-primary" : "bg-surface-muted text-ink-muted")}>
                      {openJobs ? t("{n} open jobs", { n: openJobs }) : t("No openings")}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
