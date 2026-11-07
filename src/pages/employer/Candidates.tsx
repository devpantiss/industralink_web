import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, UserSearch } from "lucide-react";
import type { ApplicationStage } from "@/types";
import { EXPERIENCE_LABEL, STAGE_LABEL, TRADE_LABEL } from "@/lib/labels";
import { timeAgo } from "@/lib/format";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { Avatar, PageHeader } from "@/components/ui/Misc";
import { StageBadge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, QueryState } from "@/components/ui/States";
import { CandidateDrawer, QualificationBadges, useCandidateMoves } from "@/components/domain/CandidatePanel";

/** Everyone who applied to any of this company's jobs, in one searchable list. */
export default function Candidates() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  // The top-bar search sends ?q=…; follow it when it changes.
  useEffect(() => { const v = sp.get("q"); if (v !== null) setQ(v); }, [sp]);
  const [stage, setStage] = useState<ApplicationStage | "">((sp.get("stage") as ApplicationStage) ?? "");
  const [jobId, setJobId] = useState("");
  const params = { q: q.trim() || undefined, stage, jobId: jobId || undefined };
  const list = useQuery({ queryKey: qk.employer.allCandidates(params), queryFn: () => employerApi.allCandidates(params) });
  const jobs = useQuery({ queryKey: qk.employer.jobs(), queryFn: () => employerApi.jobs() });
  const [openId, setOpenId] = useState<string>();
  const { requestMove, dialogs, moving } = useCandidateMoves({ list: list.data ?? [] });
  const open = list.data?.find((c) => c.id === openId);

  return (
    <div>
      <PageHeader title="Candidates" description="Everyone who applied to your jobs. Open a person to see their resume and documents." />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_220px]">
        <label className="relative">
          <span className="sr-only">Search candidates</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city, skill, licence…" className="pl-9" />
        </label>
        <Select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value as ApplicationStage | "")}>
          <option value="">All stages</option>
          {(Object.keys(STAGE_LABEL) as ApplicationStage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </Select>
        <Select aria-label="Job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">All jobs</option>
          {jobs.data?.filter((j) => j.status !== "draft").map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
      </div>

      <QueryState query={list} empty={(d) => d.length === 0 && <EmptyState icon={<UserSearch className="h-6 w-6" />} title="No candidates found" description="Try a different search, or post a job to get applicants." />}>
        {(rows) => (
          <ul className="stagger overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            {rows.map((c) => (
              <li key={c.id} className="border-b border-border last:border-0">
                <button onClick={() => setOpenId(c.id)} className="flex w-full flex-col gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={c.worker.name} />
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium text-ink">{c.worker.name}</p>
                      <p className="truncate text-small text-ink-muted">
                        {c.worker.trade ? TRADE_LABEL[c.worker.trade] : "—"} · {c.worker.experience ? EXPERIENCE_LABEL[c.worker.experience] : "—"} · {c.worker.location?.city ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="hidden min-w-0 sm:block sm:w-56"><QualificationBadges c={c} /></div>
                  <div className="flex items-center gap-3 sm:w-64 sm:justify-end">
                    <span className="min-w-0 truncate text-small text-ink-secondary">{c.jobTitle}</span>
                    <StageBadge stage={c.stage} />
                  </div>
                  <span className="hidden w-24 text-right text-caption text-ink-muted lg:block">{timeAgo(c.updatedAt)}</span>
                  <ChevronRight className="hidden h-5 w-5 text-ink-muted sm:block" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {open && <CandidateDrawer c={open} showJob onClose={() => setOpenId(undefined)} onMove={(s) => requestMove([open.id], s)} moving={moving} />}
      {dialogs}
    </div>
  );
}
