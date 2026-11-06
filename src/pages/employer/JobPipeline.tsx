import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Pencil, Search, Users, X } from "lucide-react";
import type { ApplicationStage, Candidate, Job } from "@/types";
import { EXPERIENCE_LABEL, PIPELINE_STAGES, SHIFT_LABEL, STAGE_LABEL } from "@/lib/labels";
import { formatDateTime, formatPay, timeAgo } from "@/lib/format";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { cn } from "@/lib/cn";
import { Avatar, DefinitionList, PageHeader, Tabs } from "@/components/ui/Misc";
import { JobStatusBadge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BenefitChips } from "@/components/domain/JobBits";
import { CandidateDrawer, QualificationBadges, useCandidateMoves } from "@/components/domain/CandidatePanel";

/** Each stage has its own colour so the board reads at a glance. */
const COLUMN: Record<string, { dot: string; top: string; tint: string }> = {
  applied: { dot: "bg-slate-500", top: "border-t-slate-400", tint: "bg-slate-50" },
  shortlisted: { dot: "bg-primary", top: "border-t-primary", tint: "bg-primary-soft/60" },
  interview: { dot: "bg-violet-600", top: "border-t-violet-500", tint: "bg-violet-50/60" },
  offer: { dot: "bg-amber-500", top: "border-t-amber-500", tint: "bg-amber-50/60" },
  hired: { dot: "bg-green-600", top: "border-t-green-500", tint: "bg-green-50/60" },
  rejected: { dot: "bg-red-600", top: "border-t-red-500", tint: "bg-red-50/50" },
};

export default function JobPipeline() {
  const { id = "" } = useParams();
  const job = useQuery({ queryKey: qk.employer.job(id), queryFn: () => employerApi.job(id) });
  const cands = useQuery({ queryKey: qk.employer.candidates(id), queryFn: () => employerApi.candidates(id) });
  const [tab, setTab] = useState<"pipeline" | "details">("pipeline");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string>();
  const [showRejected, setShowRejected] = useState(false);
  const toast = useToast();
  const { requestMove, dialogs, moving } = useCandidateMoves({
    list: cands.data ?? [], optimisticKey: qk.employer.candidates(id),
    defaultPlace: job.data?.walkIn?.address ?? [job.data?.siteName, job.data?.location.city].filter(Boolean).join(", "),
    onDone: () => setSelected(new Set()),
  });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    const list = cands.data ?? [];
    if (!t) return list;
    return list.filter((c) => `${c.worker.name} ${c.worker.location?.city ?? ""} ${c.worker.skills.join(" ")} ${c.worker.licences.join(" ")} ${c.worker.qualifications.join(" ")}`.toLowerCase().includes(t));
  }, [cands.data, search]);

  if (job.isLoading) return <ListSkeleton count={2} />;
  if (job.isError || !job.data) return <ErrorState onRetry={() => job.refetch()} />;
  const j = job.data;
  const open = cands.data?.find((c) => c.id === openId);
  const byStage = (s: ApplicationStage) => filtered.filter((c) => c.stage === s || (s === "applied" && c.stage === "withdrawn"));
  const rejected = filtered.filter((c) => c.stage === "rejected");
  const toggleSelect = (cid: string) => setSelected((s) => { const n = new Set(s); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });

  return (
    <div>
      <PageHeader breadcrumb={{ label: "Jobs", to: "/employer/jobs" }}
        title={<span className="flex flex-wrap items-center gap-3">{j.title} <JobStatusBadge status={j.status} /></span>}
        description={`${[j.siteName, j.location.city].filter(Boolean).join(", ")} · ${formatPay(j.payMin, j.payMax, j.payPeriod)} · ${j.openings} openings`}
        actions={<LinkButton to={`/employer/jobs/${j.id}/edit`} variant="secondary" icon={<Pencil className="h-4 w-4" />}>Edit job</LinkButton>} />

      <Tabs tabs={[{ value: "pipeline", label: "Candidates", count: cands.data?.length }, { value: "details", label: "Job details" }]} value={tab} onChange={setTab} className="mb-4" />

      {tab === "details" ? <JobDetails job={j} /> : cands.isLoading ? <ListSkeleton count={2} /> : cands.isError ? <ErrorState onRetry={() => cands.refetch()} /> : !cands.data?.length ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No applicants yet" description="Share the job with your contacts or on WhatsApp groups to get applicants faster."
          action={<Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/worker/jobs/${j.id}`); toast.success("Job link copied"); }}>Copy job link</Button>} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative w-full sm:max-w-xs">
              <span className="sr-only">Search candidates</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, licence…" className="pl-9" />
            </label>
            <p className="text-small text-ink-muted">Drag cards between columns, or open a card to see the resume.</p>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowRejected(!showRejected)}>{showRejected ? "Hide" : "Show"} rejected ({rejected.length})</Button>
          </div>

          {j.status === "active" && cands.data.filter((c) => c.stage === "hired").length >= j.openings && (
            <div className="mb-4 rounded-lg border border-success-fg/20 bg-success-bg px-4 py-3 text-body text-success-fg">
              All {j.openings} positions are filled. You can close this job from the Jobs list.
            </div>
          )}

          <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex min-w-max gap-3">
              {[...PIPELINE_STAGES, ...(showRejected ? (["rejected"] as ApplicationStage[]) : [])].map((stage) => {
                const items = stage === "rejected" ? rejected : byStage(stage);
                const col = COLUMN[stage]!;
                return (
                  <section key={stage} aria-label={STAGE_LABEL[stage]}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                    onDragLeave={() => setDragOver(undefined)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(undefined); const cid = e.dataTransfer.getData("text/plain"); if (cid) requestMove([cid], stage); }}
                    className={cn("flex w-[280px] shrink-0 flex-col rounded-lg border border-t-[3px] transition-all duration-200", col.top, col.tint,
                      dragOver === stage ? "scale-[1.01] border-primary shadow-md ring-2 ring-primary/30" : "border-border")}>
                    <header className="flex items-center gap-2 px-3 py-2.5">
                      <span className={cn("h-2 w-2 rounded-full", col.dot)} aria-hidden />
                      <h2 className="text-small font-semibold text-ink">{STAGE_LABEL[stage]}</h2>
                      <span className="rounded-full bg-surface px-2 text-caption font-medium text-ink-secondary shadow-xs tabular">{items.length}</span>
                    </header>
                    <ul className="stagger flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                      {items.map((c) => <BoardCard key={c.id} c={c} selected={selected.has(c.id)} onSelect={() => toggleSelect(c.id)} onOpen={() => setOpenId(c.id)} />)}
                      {items.length === 0 && <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border-strong p-4 text-center text-caption text-ink-muted">Drop here</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}

      {selected.size > 0 && (
        <div className="glass-ink animate-pop fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl p-3 text-white sm:bottom-6">
          <span className="px-2 text-body font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <Select aria-label="Move selected to" className="h-9 w-auto border-white/20 bg-white/10 text-white" value="" onChange={(e) => e.target.value && requestMove([...selected], e.target.value as ApplicationStage)}>
            <option value="" className="text-ink">Move to…</option>
            {PIPELINE_STAGES.map((s) => <option key={s} value={s} className="text-ink">{STAGE_LABEL[s]}</option>)}
          </Select>
          <Button size="sm" variant="danger" onClick={() => requestMove([...selected], "rejected")}>Reject</Button>
          <button aria-label="Clear selection" onClick={() => setSelected(new Set())} className="rounded p-1.5 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      {open && <CandidateDrawer c={open} onClose={() => setOpenId(undefined)} onMove={(s) => requestMove([open.id], s)} moving={moving} />}
      {dialogs}
    </div>
  );
}

function BoardCard({ c, selected, onSelect, onOpen }: { c: Candidate; selected: boolean; onSelect: () => void; onOpen: () => void }) {
  const w = c.worker;
  const withdrawn = c.stage === "withdrawn";
  const isNew = c.stage === "applied" && Date.now() - new Date(c.appliedAt).getTime() < 86_400_000;
  return (
    <li draggable={!withdrawn} onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; }}
      className={cn("group relative rounded-md border bg-surface p-3 shadow-xs transition-[box-shadow,transform] duration-200",
        withdrawn ? "border-border opacity-60" : "cursor-grab border-border hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
        selected && "border-primary ring-1 ring-primary")}>
      <div className="flex items-start gap-2.5">
        <Avatar name={w.name} size="sm" />
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block truncate text-left text-body font-medium text-ink after:absolute after:inset-0 hover:text-primary">{w.name}</button>
          <p className="truncate text-caption text-ink-muted">{w.experience ? EXPERIENCE_LABEL[w.experience] : "—"} · {w.location?.city ?? "—"}</p>
        </div>
        {isNew && <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold uppercase text-accent-on">New</span>}
        {!withdrawn && (
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${w.name}`}
            className={cn("relative z-10 mt-1 h-4 w-4 accent-[rgb(var(--primary))]", !selected && "opacity-0 focus:opacity-100 group-hover:opacity-100")} />
        )}
      </div>
      <div className="mt-2"><QualificationBadges c={c} /></div>
      {c.stage === "interview" && c.interview ? (
        <p className="mt-2 flex items-center gap-1 text-caption font-medium text-interview-fg"><CalendarClock className="h-3.5 w-3.5" aria-hidden /> {formatDateTime(c.interview.at)}</p>
      ) : (
        <p className="mt-2 text-caption text-ink-muted">Applied {timeAgo(c.appliedAt)}</p>
      )}
    </li>
  );
}

function JobDetails({ job }: { job: Job }) {
  return (
    <Card>
      <CardBody className="space-y-5">
        <DefinitionList items={[
          ["Pay", formatPay(job.payMin, job.payMax, job.payPeriod)],
          ["Shift", SHIFT_LABEL[job.shift]],
          ["Experience", EXPERIENCE_LABEL[job.experience]],
          ["Openings", String(job.openings)],
          ["Site / plant", job.siteName ?? ""],
          ["Qualification", job.qualifications.join(", ")],
          ["Calls from shortlisted workers", job.allowCalls ? `Allowed · +91 ${job.hrPhone} · ${job.callHours ?? "Anytime"}` : "Off"],
        ]} />
        <BenefitChips benefits={job.benefits} />
        {job.responsibilities.length > 0 && <div><p className="text-caption text-ink-muted">What they'll do</p><ul className="mt-1 list-disc pl-5 text-body">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul></div>}
        {job.requirements.length > 0 && <div><p className="text-caption text-ink-muted">What they need</p><ul className="mt-1 list-disc pl-5 text-body">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul></div>}
      </CardBody>
    </Card>
  );
}
