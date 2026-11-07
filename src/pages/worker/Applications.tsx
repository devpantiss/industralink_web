import { Link, useSearchParams } from "react-router-dom";
import { t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, ChevronRight, Clock, FileText, Gift, MapPin, Phone, XCircle } from "lucide-react";
import type { WorkerApplication } from "@/types";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PageHeader, Tabs } from "@/components/ui/Misc";
import { StageBadge } from "@/components/ui/Badge";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { EmptyState, QueryState } from "@/components/ui/States";
import { CompanyLogo } from "@/components/domain/JobBits";
import { payShort } from "@/components/domain/JobCard";

type Tab = "active" | "interviews" | "closed";
const isClosed = (a: WorkerApplication) => ["hired", "rejected", "withdrawn"].includes(a.stage);

const STEPS = ["Applied", "Seen", "Shortlisted", "Interview", "Offer"];

/** Which step the application has reached (0–4), counting "seen by employer". */
function stepOf(a: WorkerApplication) {
  switch (a.stage) {
    case "shortlisted": return 2;
    case "interview": return 3;
    case "offer": case "hired": return 4;
    default: return a.timeline.some((e) => e.stage === "viewed") ? 1 : 0;
  }
}

export default function Applications() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as Tab) || "active";
  const q = useQuery({ queryKey: qk.worker.applications, queryFn: workerApi.applications });
  const all = q.data ?? [];
  const groups: Record<Tab, WorkerApplication[]> = {
    active: all.filter((a) => !isClosed(a)),
    interviews: all.filter((a) => a.stage === "interview"),
    closed: all.filter(isClosed),
  };

  return (
    <div>
      <PageHeader title={t("My applications")} description={t("See where each application stands.")} />
      <Tabs
        tabs={[
          { value: "active", label: t("Active"), count: groups.active.length },
          { value: "interviews", label: t("Interviews"), count: groups.interviews.length },
          { value: "closed", label: t("Closed"), count: groups.closed.length },
        ]}
        value={tab}
        onChange={(v) => setSp({ tab: v }, { replace: true })}
        className="mb-5"
      />
      <QueryState query={q}
        empty={() => groups[tab].length === 0 && (
          <EmptyState icon={<FileText className="h-6 w-6" />}
            title={tab === "closed" ? t("Nothing here yet") : tab === "interviews" ? t("No interviews yet") : t("You haven't applied yet")}
            description={tab === "active" ? t("Find a job you like and tap Apply. It takes less than a minute.") : undefined}
            action={tab === "active" ? <LinkButton to="/worker/jobs">{t("Find jobs")}</LinkButton> : undefined} />
        )}>
        {() => (
          <ul key={tab} className="space-y-3">
            {groups[tab].map((a) => <li key={a.id} className="animate-rise"><AppCard a={a} /></li>)}
          </ul>
        )}
      </QueryState>
    </div>
  );
}

function AppCard({ a }: { a: WorkerApplication }) {
  const closed = isClosed(a) && a.stage !== "hired";
  const step = stepOf(a);
  const pay = payShort(a.job);
  return (
    <article className="relative rounded-lg border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <CompanyLogo job={a.job} />
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 font-bold text-ink">
            <Link to={`/worker/applications/${a.id}`} className="after:absolute after:inset-0 hover:text-primary">{a.job.title}</Link>
          </h3>
          <p className="truncate text-small text-ink-secondary">{a.job.companyName} · {pay ? `${pay.range}${pay.per}` : t("Pay not shown")} · {a.job.location.city}</p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <StageBadge stage={a.stage} audience="worker" />
          {a.contact && <a href={`tel:+91${a.contact.phone}`} className={buttonClass("primary", "sm")}><Phone className="h-4 w-4" aria-hidden /> {t("Call HR")}</a>}
          <Link to={`/worker/jobs/${a.job.id}`} className={buttonClass("secondary", "sm")}>{t("View job")}</Link>
          <ChevronRight className="hidden h-5 w-5 text-ink-muted sm:block" aria-hidden />
        </div>
      </div>

      {closed ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-muted px-3.5 py-3 text-small text-ink-secondary">
          <XCircle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          {a.stage === "withdrawn" ? t("You withdrew this application.") : t("Not selected this time. Keep applying, new jobs come every day.")}
        </p>
      ) : (
        <>
          <ol className="relative mt-5 grid grid-cols-5" aria-label={t("Progress: {step}", { step: t(STEPS[step]!) })}>
            <span className="absolute left-[10%] right-[10%] top-[10px] h-0.5 bg-border" aria-hidden />
            <span className="origin-left-grow absolute left-[10%] top-[10px] h-0.5 bg-primary" style={{ width: `${(step / 4) * 80}%` }} aria-hidden />
            {STEPS.map((s, i) => {
              const done = i < step || a.stage === "hired";
              const now = i === step && a.stage !== "hired";
              return (
                <li key={s} className={cn("relative flex flex-col items-center gap-1.5 text-center text-[11px] font-medium sm:text-caption", done ? "text-ink-secondary" : now ? "font-bold text-ink" : "text-ink-muted")} aria-current={now ? "step" : undefined}>
                  <span className={cn("flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 bg-surface",
                    done ? "border-primary bg-primary text-white" : now ? "border-primary" : "border-border-strong")}>
                    {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : now ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  </span>
                  {t(s)}
                </li>
              );
            })}
          </ol>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-surface-muted px-3.5 py-3 text-small text-ink-secondary">
            {a.stage === "interview" && a.interview ? (
              <><CalendarClock className="h-4 w-4 shrink-0 text-tile-purple-ink" aria-hidden /><b className="text-ink">{t("Interview")} · {formatDateTime(a.interview.at)}</b><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{a.interview.place}</span></>
            ) : a.stage === "offer" || a.stage === "hired" ? (
              <><Gift className="h-4 w-4 shrink-0 text-success-fg" aria-hidden /><b className="text-ink">{a.stage === "hired" ? t("You're hired. Congratulations!") : t("You have an offer. Open it to reply.")}</b></>
            ) : a.stage === "shortlisted" && !a.contact ? (
              <><Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /><b className="text-ink">{t("You're shortlisted.")}</b> {t("The employer will contact you soon.")}</>
            ) : a.contact ? (
              <><Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden /><span>{t("You're shortlisted. You can call HR")} <b className="text-ink">+91 {a.contact.phone}</b>{a.contact.hours ? ` (${a.contact.hours})` : ""}</span></>
            ) : (
              <><Clock className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />{step === 1 ? t("The employer has seen your profile.") : t("Sent. Most employers reply in 2 to 3 days.")} <span className="text-ink-muted">· {t("Updated {when}", { when: timeAgo(a.updatedAt) })}</span></>
            )}
          </p>
        </>
      )}
    </article>
  );
}
