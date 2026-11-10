import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, Globe, MapPin, Users } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorCode } from "@/api/client";
import { HIRING_TYPE_LABEL, SECTOR_LABEL } from "@/lib/labels";
import { VerifiedTick } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { JobCard } from "@/components/domain/JobCard";
import { CompanyLogo } from "@/components/domain/JobBits";
import { BannerArt } from "@/components/ui/Misc";
import { useSaveJob } from "@/hooks/useSaveJob";
import { t } from "@/lib/i18n";

export default function CompanyDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: qk.worker.company(id), queryFn: () => workerApi.company(id) });
  const { toggle, pendingId } = useSaveJob();
  if (q.isLoading) return <ListSkeleton count={2} />;
  if (q.isError && errorCode(q.error) === "NOT_FOUND") return <EmptyState title={t("Company not found")} action={<LinkButton to="/worker/jobs">{t("Find jobs")}</LinkButton>} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const { company: c, jobs } = q.data;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <div className="relative h-24 overflow-hidden bg-surface-muted sm:h-28"><BannerArt className="w-[70%] sm:w-[45%]" /></div>
        <div className="px-5 pb-5 sm:px-6">
          <CompanyLogo job={{ companyName: c.name, sector: c.sector, companyLogoUrl: c.logoUrl }} size="lg" className="relative -mt-9 h-16 w-16 border-4 border-surface" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-h1">{c.name}</h1>
            <VerifiedTick verified={c.verification === "approved"} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-body text-ink-secondary">
            <li className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" aria-hidden /> {t(SECTOR_LABEL[c.sector])}</li>
            <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {c.location.city}{c.location.state ? `, ${c.location.state}` : ""}</li>
            <li className="flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden /> {c.size} {t("people")}</li>
            {c.website && <li className="flex items-center gap-1.5"><Globe className="h-4 w-4" aria-hidden /> {c.website}</li>}
            {c.hiringType === "agency" && <li className="flex items-center gap-1.5"><Building2 className="h-4 w-4" aria-hidden /> {t(HIRING_TYPE_LABEL.agency)}</li>}
          </ul>
          {c.about && <p className="mt-4 max-w-3xl text-body text-ink">{c.about}</p>}
          {c.address && (
            <a className="mt-3 inline-flex items-center gap-1 text-small font-semibold text-primary hover:underline" target="_blank" rel="noreferrer"
              href={`https://maps.google.com/?q=${encodeURIComponent([c.address, c.location.city, c.location.state, c.pincode].filter(Boolean).join(", "))}`}>
              <MapPin className="h-4 w-4" aria-hidden /> {[c.address, c.pincode].filter(Boolean).join(", ")} · {t("Open in Maps")}
            </a>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-h2">{t("Open jobs")} <span className="text-ink-muted">({jobs.length})</span></h2>
        {jobs.length === 0 ? <EmptyState title={t("No open jobs right now")} description={t("Save a job you like elsewhere, and check back later.")} /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{jobs.map((j) => <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} />)}</div>
        )}
      </section>
    </div>
  );
}
