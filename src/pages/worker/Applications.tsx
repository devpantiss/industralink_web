import { Link, useSearchParams } from "react-router-dom";
import { t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, FileText } from "lucide-react";
import type { WorkerApplication } from "@/types";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { formatDateTime, timeAgo } from "@/lib/format";
import { PageHeader, Tabs } from "@/components/ui/Misc";
import { StageBadge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, QueryState } from "@/components/ui/States";
import { CompanyLogo } from "@/components/domain/JobBits";

type Tab = "active" | "interviews" | "closed";
const isClosed = (a: WorkerApplication) => ["hired", "rejected", "withdrawn"].includes(a.stage);

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
        className="mb-4"
      />
      <QueryState query={q}
        empty={() => groups[tab].length === 0 && (
          <EmptyState icon={<FileText className="h-6 w-6" />}
            title={tab === "closed" ? t("Nothing here yet") : tab === "interviews" ? t("No interviews yet") : t("You haven't applied yet")}
            description={tab === "active" ? t("Find a job you like and tap Apply. It takes less than a minute.") : undefined}
            action={tab === "active" ? <LinkButton to="/worker/jobs">{t("Find jobs")}</LinkButton> : undefined} />
        )}>
        {() => (
          <ul className="flex flex-col gap-3">
            {groups[tab].map((a) => (
              <li key={a.id}>
                <Link to={`/worker/applications/${a.id}`} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-xs transition-shadow hover:border-border-strong hover:shadow-md">
                  <CompanyLogo job={a.job} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-h3 text-ink">{a.job.title}</p>
                      <StageBadge stage={a.stage} audience="worker" />
                    </div>
                    <p className="truncate text-small text-ink-secondary">{a.job.companyName} · {a.job.location.city}</p>
                    {a.stage === "interview" && a.interview ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-small font-medium text-interview-fg"><CalendarClock className="h-4 w-4" aria-hidden /> {formatDateTime(a.interview.at)}</p>
                    ) : (
                      <p className="mt-1 text-caption text-ink-muted">{t("Updated {when}", { when: timeAgo(a.updatedAt) })}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
