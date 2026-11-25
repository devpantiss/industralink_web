import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, Briefcase, CalendarClock, Check, ChevronDown, ChevronRight, Clock, Columns3, Download, FileImage, FileText, Info, Languages, List, Mail,
  MapPin, MessageCircle, MessageSquare, Pencil, Phone, Search, Share2, ShieldCheck, Wallet, X,
} from "lucide-react";
import type { ApplicationStage, Candidate, Job, WorkerDocument } from "@/types";
import { AVAILABILITY_LABEL, DOC_TYPE_LABEL, EXPERIENCE_LABEL, PIPELINE_STAGES, SHIFT_LABEL, STAGE_LABEL, TRADE_LABEL, PAY_TYPE_LABEL } from "@/lib/labels";
import { formatBytes, formatDate, formatDateTime, formatNumber, formatPay, timeAgo } from "@/lib/format";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { cn } from "@/lib/cn";
import { Avatar, DefinitionList } from "@/components/ui/Misc";
import { JobStatusBadge, StageBadge } from "@/components/ui/Badge";
import { Button, LinkButton, buttonClass } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BenefitChips } from "@/components/domain/JobBits";
import { CandidateDrawer, DocumentPreview, OfferSummary, QualificationBadges, ReplyBadge, useCandidateMoves, useMarkSeen, WorkHistoryList } from "@/components/domain/CandidatePanel";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSlideIndicator } from "@/hooks/useSlideIndicator";

type StageTab = "all" | ApplicationStage;
const TABS: { value: StageTab; label: string }[] = [
  { value: "all", label: "All applied" },
  { value: "applied", label: "New" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const STAGE_CHIP: Record<ApplicationStage, string> = {
  applied: "bg-surface-strong text-ink-secondary", shortlisted: "bg-primary-soft text-primary", interview: "bg-tile-purple text-tile-purple-ink",
  offer: "bg-tile-yellow text-tile-yellow-ink", hired: "bg-tile-green text-tile-green-ink", rejected: "bg-tile-rose text-tile-rose-ink", withdrawn: "bg-surface-strong text-ink-muted",
};

/** Each board column has its own colour so the board reads at a glance. */
const COLUMN: Record<string, { dot: string; top: string }> = {
  applied: { dot: "bg-ink-muted", top: "border-t-border-strong" },
  shortlisted: { dot: "bg-primary", top: "border-t-primary" },
  interview: { dot: "bg-tile-purple-ink", top: "border-t-tile-purple-ink" },
  offer: { dot: "bg-accent", top: "border-t-accent" },
  hired: { dot: "bg-tile-green-ink", top: "border-t-tile-green-ink" },
  rejected: { dot: "bg-danger-fg", top: "border-t-danger-fg" },
};

const nextStageOf = (s: ApplicationStage) => {
  const i = PIPELINE_STAGES.indexOf(s);
  return i >= 0 && i < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[i + 1] : undefined;
};
const NEXT_LABEL: Partial<Record<ApplicationStage, string>> = { shortlisted: "Shortlist", interview: "Schedule interview", offer: "Send offer", hired: "Mark as hired" };

export default function JobPipeline() {
  const { id = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const wide = useMediaQuery("(min-width: 1024px)");
  const job = useQuery({ queryKey: qk.employer.job(id), queryFn: () => employerApi.job(id) });
  const cands = useQuery({ queryKey: qk.employer.candidates(id), queryFn: () => employerApi.candidates(id) });
  const [tab, setTab] = useState<StageTab>("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string>();
  const toast = useToast();
  const activeId = sp.get("c") ?? undefined;
  const setActive = (cid: string) => setSp((p) => { const n = new URLSearchParams(p); n.set("c", cid); return n; }, { replace: true });

  const { requestMove, dialogs, moving } = useCandidateMoves({
    list: cands.data ?? [], optimisticKey: qk.employer.candidates(id),
    defaultPlace: job.data?.walkIn?.address ?? [job.data?.siteName, job.data?.address, job.data?.location.city].filter(Boolean).join(", "),
    offerDefaults: job.data ? { pay: job.data.payMax ?? job.data.payMin, payPeriod: job.data.payPeriod, payType: job.data.payType } : undefined,
    onDone: () => setSelected(new Set()),
    job: job.data ? { id: job.data.id, title: job.data.title, openings: job.data.openings, status: job.data.status } : undefined,
  });

  const searched = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = [...(cands.data ?? [])].sort((a, b) => (sort === "newest" ? 1 : -1) * (+new Date(b.appliedAt) - +new Date(a.appliedAt)));
    if (!s) return list;
    return list.filter((c) => `${c.worker.name} ${c.worker.location?.city ?? ""} ${c.worker.skills.join(" ")} ${c.worker.licences.join(" ")} ${c.worker.qualifications.join(" ")}`.toLowerCase().includes(s));
  }, [cands.data, search, sort]);
  const inTab = (c: Candidate, t: StageTab) => t === "all" ? c.stage !== "rejected" : t === "applied" ? c.stage === "applied" || c.stage === "withdrawn" : c.stage === t;
  const shown = searched.filter((c) => inTab(c, tab));
  const counts = Object.fromEntries(TABS.map((t) => [t.value, (cands.data ?? []).filter((c) => inTab(c, t.value)).length])) as Record<StageTab, number>;
  const active = shown.find((c) => c.id === activeId) ?? (activeId ? cands.data?.find((c) => c.id === activeId) : undefined) ?? shown[0];

  // Open a candidate sent from elsewhere (e.g. the dashboard) in the right tab.
  useEffect(() => {
    const c = cands.data?.find((x) => x.id === activeId);
    if (c && !inTab(c, tab)) setTab("all");
    if (c && !wide) setDrawerId(c.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cands.data, activeId]);

  const tabsInd = useSlideIndicator<HTMLDivElement>("x", [tab, cands.data?.length, job.data?.id]);
  const viewInd = useSlideIndicator<HTMLDivElement>("x", [view, job.data?.id]);

  if (job.isLoading) return <ListSkeleton count={2} />;
  if (job.isError || !job.data) return <ErrorState onRetry={() => job.refetch()} />;
  const j = job.data;
  const drawerCand = cands.data?.find((c) => c.id === drawerId);
  const toggleSelect = (cid: string) => setSelected((s) => { const n = new Set(s); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });
  const movable = shown.filter((c) => c.stage !== "withdrawn");
  const allChecked = movable.length > 0 && movable.every((c) => selected.has(c.id));
  const tabLabel = TABS.find((t) => t.value === tab)!.label;

  const copyLink = async () => {
    const url = `${window.location.origin}/jobs/${j.id}`;
    try { await navigator.clipboard.writeText(url); toast.success("Job link copied. Share it on WhatsApp groups."); } catch { toast.error(url); }
  };
  const exportCsv = () => {
    const rows = [["Name", "Phone", "City", "Trade", "Experience", "Stage", "Applied on", "Expected pay"],
      ...searched.map((c) => [c.worker.name, `+91 ${c.worker.phone}`, c.worker.location?.city ?? "", c.worker.trade ? TRADE_LABEL[c.worker.trade] : "", c.worker.experience ? EXPERIENCE_LABEL[c.worker.experience] : "", STAGE_LABEL[c.stage], formatDate(c.appliedAt), c.worker.expectedPay ? String(c.worker.expectedPay) : ""])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${j.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-applicants.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(`Downloaded ${searched.length} applicants`);
  };
  const openCandidate = (c: Candidate) => { setActive(c.id); if (!wide || view === "board") setDrawerId(c.id); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{j.title}</h1><JobStatusBadge status={j.status} /></div>
          <p className="mt-1 text-small text-ink-secondary">
            <Link to="/employer/jobs" className="hover:text-primary">Jobs</Link> / <span>{j.title}</span> / <b className="font-semibold text-primary">{view === "board" ? "Board" : tabLabel}</b>
          </p>
          <p className="mt-0.5 text-caption text-ink-muted">{[j.siteName, j.location.city].filter(Boolean).join(", ")} · {formatPay(j.payMin, j.payMax, j.payPeriod)} · {j.openings} openings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="h-10" icon={<Share2 className="h-4 w-4" />} onClick={copyLink}>Share link</Button>
          <LinkButton to={`/employer/jobs/${j.id}/edit`} variant="secondary" size="sm" className="h-10" icon={<Pencil className="h-4 w-4" />}>Edit job</LinkButton>
          <Button size="sm" className="h-10" icon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!searched.length}>Export list</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div ref={tabsInd.box} role="tablist" aria-label="Stages" className={cn("scrollbar-none relative flex gap-0.5 overflow-x-auto rounded-xl border border-border bg-surface p-1", view === "board" && "pointer-events-none opacity-40")}>
          <span ref={tabsInd.ind} className="slide-ind absolute left-0 top-1 h-9 w-0 rounded-lg bg-primary" aria-hidden />
          {TABS.map((t) => (
            <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
              className={cn("relative z-10 flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-small font-semibold transition-colors", tab === t.value ? "text-white" : "text-ink-secondary hover:text-ink")}>
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[11px] font-bold leading-[18px] tabular transition-colors", tab === t.value ? "bg-white/20 text-white" : "bg-surface-strong text-ink-secondary")}>{counts[t.value]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div ref={viewInd.box} className="relative flex rounded-xl border border-border bg-surface p-1" role="group" aria-label="View">
            <span ref={viewInd.ind} className="slide-ind absolute left-0 top-1 h-8 w-0 rounded-lg bg-surface-strong" aria-hidden />
            <button aria-pressed={view === "list"} onClick={() => setView("list")} className="relative z-10 flex h-8 items-center gap-1.5 rounded-lg px-3 text-small font-semibold text-ink"><List className="h-4 w-4" aria-hidden />List</button>
            <button aria-pressed={view === "board"} onClick={() => setView("board")} className="relative z-10 flex h-8 items-center gap-1.5 rounded-lg px-3 text-small font-semibold text-ink"><Columns3 className="h-4 w-4" aria-hidden />Board</button>
          </div>
          <Button variant="secondary" size="sm" className="h-10" icon={<Info className="h-4 w-4" />} onClick={() => setDetailsOpen(true)}>Job details</Button>
        </div>
      </div>

      {j.status === "active" && (cands.data ?? []).filter((c) => c.stage === "hired").length >= j.openings && (
        <div className="rounded-lg border border-success-fg/20 bg-success-bg px-4 py-3 text-body text-success-fg">All {j.openings} positions are filled. You can close this job from the Jobs list.</div>
      )}

      {cands.isLoading ? <ListSkeleton count={2} /> : cands.isError ? <ErrorState onRetry={() => cands.refetch()} /> : !cands.data?.length ? (
        <EmptyState art="people" title="No applicants yet" description="Share the job with your contacts or on WhatsApp groups to get applicants faster."
          action={<Button variant="secondary" onClick={copyLink}>Copy job link</Button>} />
      ) : view === "board" ? (
        <Board list={searched} selected={selected} onSelect={toggleSelect} onOpen={openCandidate} onDrop={(cid, stage) => requestMove([cid], stage)} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="flex flex-col gap-3 rounded-lg border border-border p-4 lg:sticky lg:top-24" aria-label="Applicants">
            <div className="flex items-center justify-between"><h2 className="text-body-lg font-bold">Applicants</h2><span className="text-caption text-ink-muted">{shown.length} shown</span></div>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-ink-muted focus-within:border-primary">
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only">Search applicants</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city, licence…" className="min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-ink-muted" />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search" className="text-ink-muted hover:text-ink"><X className="h-4 w-4" /></button>}
            </label>
            <div className="flex items-center justify-between px-1 text-small text-ink-secondary">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={allChecked} disabled={!movable.length} onChange={() => setSelected(allChecked ? new Set() : new Set(movable.map((c) => c.id)))} className="h-4 w-4" />
                Select all
              </label>
              <label className="relative inline-flex items-center gap-1 font-semibold">
                <span className="sr-only">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="appearance-none bg-transparent pr-5 text-small font-semibold text-ink-secondary outline-none">
                  <option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4" aria-hidden />
              </label>
            </div>
            {shown.length === 0 ? (
              <EmptyState compact art={search ? "search" : "people"} title={search ? "No one matches that search" : `No one in ${tabLabel} yet`} />
            ) : (
              <ul className="-mx-1 max-h-[560px] space-y-0.5 overflow-y-auto px-1">
                {shown.map((c) => {
                  const isActive = wide && active?.id === c.id;
                  const isNew = c.stage === "applied" && Date.now() - new Date(c.appliedAt).getTime() < 86_400_000;
                  return (
                    <li key={c.id} className={cn("animate-rise flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors", isActive ? "bg-primary-soft" : "hover:bg-surface-muted")}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} disabled={c.stage === "withdrawn"} aria-label={`Select ${c.worker.name}`} className="h-4 w-4 shrink-0" />
                      <button onClick={() => openCandidate(c)} aria-pressed={isActive} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <Avatar name={c.worker.name} src={c.worker.photoUrl} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5"><b className="truncate text-small font-semibold text-ink">{c.worker.name}</b>{isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger-fg" aria-label="New" />}</span>
                          <span className="block truncate text-caption text-ink-muted tabular">{formatDate(c.appliedAt)} · {c.worker.location?.city ?? "—"}</span>
                        </span>
                        <span className={cn("shrink-0 rounded-full px-2 text-[11px] font-bold leading-5", STAGE_CHIP[c.stage])}>{STAGE_LABEL[c.stage]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {wide && active && (
            <CandidatePane key={active.id} c={active} job={j} moving={moving} onMove={(s) => requestMove([active.id], s)} />
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="glass-ink animate-pop fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl p-3 text-white lg:bottom-6">
          <span className="px-2 text-body font-semibold">{selected.size} selected</span>
          <div className="flex-1" />
          <label className="relative">
            <span className="sr-only">Move selected to</span>
            <select className="h-9 appearance-none rounded-lg bg-white/15 pl-3 pr-8 text-small font-semibold text-white outline-none hover:bg-white/25" value="" onChange={(e) => e.target.value && requestMove([...selected], e.target.value as ApplicationStage)}>
              <option value="" className="text-ink">Move to…</option>
              {PIPELINE_STAGES.map((s) => <option key={s} value={s} className="text-ink">{STAGE_LABEL[s]}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          </label>
          <button onClick={() => requestMove([...selected], "rejected")} className="h-9 rounded-lg bg-white/15 px-3 text-small font-semibold hover:bg-white/25">Reject</button>
          <button aria-label="Clear selection" onClick={() => setSelected(new Set())} className="rounded-lg p-2 text-white/80 hover:bg-white/15 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}

      <Drawer open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Job details" subtitle={j.title}><JobDetails job={j} /></Drawer>
      {drawerCand && <CandidateDrawer c={drawerCand} onClose={() => setDrawerId(undefined)} onMove={(s) => requestMove([drawerCand.id], s)} moving={moving} />}
      {dialogs}
    </div>
  );
}

/* ---------------- Candidate profile pane (desktop) ---------------- */

function CandidatePane({ c, job, onMove, moving }: { c: Candidate; job: Job; onMove: (s: ApplicationStage) => void; moving: boolean }) {
  const w = c.worker;
  const next = nextStageOf(c.stage);
  const closed = c.stage === "withdrawn" || c.stage === "hired" || c.stage === "rejected";
  const contactOpen = ["shortlisted", "interview", "offer", "hired"].includes(c.stage);
  const [doc, setDoc] = useState<WorkerDocument>();
  const qual = [...w.qualifications, ...w.licences];
  const missingLicences = (job.licences ?? []).filter((l) => !w.licences.includes(l));
  useMarkSeen(c);

  return (
    <section className="animate-rise overflow-hidden rounded-lg border border-border" aria-label={`${w.name}'s profile`}>
      <div className="relative flex h-32 flex-col items-center justify-center overflow-hidden bg-gradient-to-r from-[rgb(var(--hero-from))] via-primary to-[rgb(var(--hero-to))] px-6 text-center text-white">
        <svg viewBox="0 0 800 128" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <g fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="22"><path d="M560-20 640 64 560 148" /><path d="M640-20 720 64 640 148" /><path d="M180-20 100 64 180 148" /></g>
        </svg>
        <h2 className="relative text-[21px] font-extrabold tracking-tight">{job.title}</h2>
        <p className="relative text-small text-white/80">Review the worker and choose the next step</p>
      </div>

      <div className="relative px-6"><Avatar name={w.name} src={w.photoUrl} size="xl" className="-mt-10 border-4 border-surface" /></div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 pb-5 pt-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-[21px] font-extrabold tracking-tight">{w.name}</h3><StageBadge stage={c.stage} /></div>
          <p className="text-small text-ink-secondary">{w.trade ? TRADE_LABEL[w.trade] : "Worker"} from {w.location ? `${w.location.city}, ${w.location.state}` : "—"} · {w.experience ? EXPERIENCE_LABEL[w.experience] : "—"}</p>
          <div className="mt-2"><QualificationBadges c={c} /></div>
        </div>
        {!closed ? (
          <div className="flex flex-wrap items-center gap-2">
            {contactOpen && <Link to={`/employer/messages?c=${c.id}`} aria-label="Send message" title="Send message" className={cn(buttonClass("secondary"), "w-10 px-0")}><Mail className="h-4 w-4" /></Link>}
            <Button variant="secondary" className="text-danger-fg hover:bg-danger-bg" onClick={() => onMove("rejected")}>Not suitable</Button>
            {next && <Button onClick={() => onMove(next)} loading={moving} icon={next === "interview" ? <CalendarClock className="h-4 w-4" /> : <Check className="h-4 w-4" />}>{NEXT_LABEL[next] ?? `Move to ${STAGE_LABEL[next]}`}</Button>}
          </div>
        ) : (
          <p className="text-small text-ink-muted">{c.stage === "withdrawn" ? "This worker withdrew their application." : c.stage === "hired" ? "Hired. Great work." : "Rejected. You can still move them back."}</p>
        )}
      </div>

      {c.stage === "interview" && c.interview && (
        <div className="mx-6 mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-tile-purple p-4 text-tile-purple-ink">
          <CalendarClock className="h-5 w-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 text-small"><b>Interview {formatDateTime(c.interview.at)}</b><span className="block">{[c.interview.place, c.interview.contactPerson && `ask for ${c.interview.contactPerson}`].filter(Boolean).join(" · ")}{c.interview.responseNote ? ` · "${c.interview.responseNote}"` : ""}</span></div>
          <ReplyBadge response={c.interview.response} />
          <Button size="sm" variant="secondary" onClick={() => onMove("interview")}>{c.interview.response === "cant_attend" ? "Pick a new time" : "Reschedule"}</Button>
        </div>
      )}
      {c.stage === "offer" && (
        <div className={cn("mx-6 mt-5 rounded-xl p-4 text-small font-semibold", c.offerResponse === "accepted" ? "bg-success-bg text-success-fg" : "bg-tile-yellow text-tile-yellow-ink")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {c.offerResponse === "accepted" ? "✓ Accepted your offer. Mark as hired once they join." : "Offer sent. Waiting for the worker to accept."}
              <OfferSummary offer={c.offer} />
            </div>
            {c.offerResponse !== "accepted" && <Button size="sm" variant="secondary" onClick={() => onMove("offer")}>Change offer</Button>}
          </div>
        </div>
      )}

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">
          <div>
            <h4 className="mb-2 text-body-lg font-bold">About</h4>
            <p className="text-body text-ink-secondary">{w.about || "This worker hasn't written about themselves. See their trade, skills and documents below."}</p>
          </div>
          {w.skills.length > 0 && (
            <div>
              <h4 className="mb-2 text-body-lg font-bold">Skills</h4>
              <ul className="flex flex-wrap gap-1.5">{w.skills.map((s) => <li key={s} className="rounded-full border border-border px-3 py-1 text-small font-semibold text-ink-secondary">{s}</li>)}</ul>
            </div>
          )}
          {!!w.workHistory?.length && (
            <div>
              <h4 className="mb-2 text-body-lg font-bold">Work history</h4>
              <WorkHistoryList items={w.workHistory} />
            </div>
          )}
          {missingLicences.length > 0 && (
            <p className="rounded-lg bg-warning-bg px-3 py-2 text-small text-warning-fg">This job needs {missingLicences.join(", ")}. It's not on this worker's profile. Ask them before shortlisting.</p>
          )}
          {qual.length > 0 && (
            <div>
              <h4 className="mb-2 text-body-lg font-bold">Qualifications & licences</h4>
              <ul className="space-y-2.5">
                {qual.map((q) => (
                  <li key={q} className="flex items-center gap-3 text-body"><span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-white"><Check className="h-3 w-3" strokeWidth={3} aria-hidden /></span>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className="mb-3 text-body-lg font-bold">Activity</h4>
            <ol className="space-y-3 border-l-2 border-border pl-4">
              {[...c.timeline].reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn("absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-surface", i === 0 ? "bg-primary" : "bg-border-strong")} aria-hidden />
                  <p className="text-small font-semibold text-ink">{e.stage === "viewed" ? "Seen by you" : STAGE_LABEL[e.stage]}</p>
                  <p className="text-caption text-ink-muted">{formatDateTime(e.at)}{e.note ? ` · "${e.note}"` : ""}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="space-y-3 rounded-xl bg-surface-muted p-4">
            <h4 className="text-body font-bold">Overview</h4>
            <Ov icon={Briefcase} label="Applied for" value={c.jobTitle} />
            <Ov icon={CalendarClock} label="Application date" value={`${formatDateTime(c.appliedAt)} · ${timeAgo(c.appliedAt)}`} />
            <Ov icon={Wallet} label="Expected pay" value={w.expectedPay ? `₹${formatNumber(w.expectedPay)} / month` : "Not given"} />
            <Ov icon={Clock} label="Can join" value={AVAILABILITY_LABEL[w.availability]} />
            <Ov icon={MapPin} label="Shift · move for work" value={`${w.shiftPreference ? SHIFT_LABEL[w.shiftPreference] : "Any shift"} · ${w.willingToRelocate ? "Ready to move" : "Local only"}`} />
            {w.languages?.length ? <Ov icon={Languages} label="Languages" value={w.languages.join(", ")} /> : null}
            {w.safetyTrainingHours ? <Ov icon={ShieldCheck} label="Safety training" value={`${w.safetyTrainingHours} hours`} /> : null}
          </div>

          <div>
            <h4 className="mb-2 text-body font-bold">Documents <span className="font-normal text-ink-muted">({c.documents.length})</span></h4>
            {c.documents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-strong p-4 text-small text-ink-muted">No documents. Many workers have no resume; their profile above works as one.</p>
            ) : (
              <ul className="space-y-2">
                {c.documents.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => setDoc(d)} className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:border-border-strong">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tile-blue text-tile-blue-ink">{d.mimeType.startsWith("image/") ? <FileImage className="h-4 w-4" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}</span>
                      <span className="min-w-0 flex-1"><b className="block truncate text-small font-semibold">{DOC_TYPE_LABEL[d.type]}{d.id === c.documentId ? " · sent with application" : ""}</b><span className="block truncate text-caption text-ink-muted">{d.name} · {formatBytes(d.sizeBytes)}</span></span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 rounded-xl bg-success-bg p-4">
            <p className="flex items-center gap-2 text-small font-bold text-success-fg"><BadgeCheck className="h-4 w-4" aria-hidden /> Mobile verified · +91 {w.phone}</p>
            <div className="flex gap-2">
              <a href={`tel:+91${w.phone}`} className={cn(buttonClass("primary", "sm"), "flex-1")}><Phone className="h-4 w-4" aria-hidden /> Call</a>
              <a href={`https://wa.me/91${w.phone}`} target="_blank" rel="noreferrer" className={cn(buttonClass("secondary", "sm"), "flex-1")}><MessageCircle className="h-4 w-4 text-[#1FA855]" aria-hidden /> WhatsApp</a>
            </div>
            {contactOpen && <Link to={`/employer/messages?c=${c.id}`} className="inline-flex items-center gap-1 text-small font-semibold text-success-fg hover:underline"><MessageSquare className="h-4 w-4" aria-hidden /> Open chat</Link>}
          </div>
        </aside>
      </div>

      <Drawer open={!!doc} onClose={() => setDoc(undefined)} width="max-w-[640px]" title={doc ? DOC_TYPE_LABEL[doc.type] : ""} subtitle={doc?.name}>
        {doc && <DocumentPreview doc={doc} tall />}
      </Drawer>
    </section>
  );
}

function Ov({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-secondary"><Icon className="h-4 w-4" aria-hidden /></span>
      <span className="min-w-0"><span className="block text-caption text-ink-muted">{label}</span><span className="block text-small font-semibold text-ink">{value}</span></span>
    </div>
  );
}

/* ---------------- Board view (drag between columns) ---------------- */

function Board({ list, selected, onSelect, onOpen, onDrop }: { list: Candidate[]; selected: Set<string>; onSelect: (id: string) => void; onOpen: (c: Candidate) => void; onDrop: (id: string, s: ApplicationStage) => void }) {
  const [dragOver, setDragOver] = useState<string>();
  const [showRejected, setShowRejected] = useState(false);
  const rejected = list.filter((c) => c.stage === "rejected");
  const byStage = (s: ApplicationStage) => s === "rejected" ? rejected : list.filter((c) => c.stage === s || (s === "applied" && c.stage === "withdrawn"));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-small text-ink-muted">Drag cards between columns, or open a card to see the full profile.</p>
        <Button variant="ghost" size="sm" onClick={() => setShowRejected(!showRejected)}>{showRejected ? "Hide" : "Show"} rejected ({rejected.length})</Button>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-max gap-3">
          {[...PIPELINE_STAGES, ...(showRejected ? (["rejected"] as ApplicationStage[]) : [])].map((stage) => {
            const items = byStage(stage);
            const col = COLUMN[stage]!;
            return (
              <section key={stage} aria-label={STAGE_LABEL[stage]}
                onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(undefined)}
                onDrop={(e) => { e.preventDefault(); setDragOver(undefined); const cid = e.dataTransfer.getData("text/plain"); if (cid) onDrop(cid, stage); }}
                className={cn("flex w-[280px] shrink-0 flex-col rounded-lg border border-t-[3px] bg-surface-muted transition-[border-color,box-shadow] duration-200", col.top,
                  dragOver === stage ? "border-primary shadow-md ring-2 ring-primary/30" : "border-border")}>
                <header className="flex items-center gap-2 px-3 py-2.5">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} aria-hidden />
                  <h2 className="text-small font-bold text-ink">{STAGE_LABEL[stage]}</h2>
                  <span className="ml-auto rounded-full border border-border bg-surface px-2 text-caption font-semibold text-ink-secondary tabular">{items.length}</span>
                </header>
                <ul className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                  {items.map((c) => <BoardCard key={c.id} c={c} selected={selected.has(c.id)} onSelect={() => onSelect(c.id)} onOpen={() => onOpen(c)} />)}
                  {items.length === 0 && <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border-strong p-4 text-center text-caption text-ink-muted">Drop here</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BoardCard({ c, selected, onSelect, onOpen }: { c: Candidate; selected: boolean; onSelect: () => void; onOpen: () => void }) {
  const w = c.worker;
  const withdrawn = c.stage === "withdrawn";
  const isNew = c.stage === "applied" && Date.now() - new Date(c.appliedAt).getTime() < 86_400_000;
  return (
    <li draggable={!withdrawn} onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; }}
      className={cn("animate-rise group relative rounded-lg border bg-surface p-3 transition-[box-shadow,border-color] duration-200",
        withdrawn ? "border-border opacity-60" : "cursor-grab border-border hover:border-border-strong hover:shadow-md active:cursor-grabbing",
        selected && "border-primary ring-1 ring-primary")}>
      <div className="flex items-start gap-2.5">
        <Avatar name={w.name} src={w.photoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="block truncate text-left text-body font-semibold text-ink after:absolute after:inset-0 hover:text-primary">{w.name}</button>
          <p className="truncate text-caption text-ink-muted">{w.experience ? EXPERIENCE_LABEL[w.experience] : "—"} · {w.location?.city ?? "—"}</p>
        </div>
        {isNew && <span className="rounded-full bg-danger-fg px-1.5 py-px text-[10px] font-bold uppercase text-white">New</span>}
        {!withdrawn && (
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${w.name}`}
            className={cn("relative z-10 mt-1 h-4 w-4", !selected && "opacity-0 focus:opacity-100 group-hover:opacity-100")} />
        )}
      </div>
      <div className="mt-2"><QualificationBadges c={c} /></div>
      {c.stage === "interview" && c.interview ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <p className="flex items-center gap-1 text-caption font-semibold text-tile-purple-ink"><CalendarClock className="h-3.5 w-3.5" aria-hidden /> {formatDateTime(c.interview.at)}</p>
          <ReplyBadge response={c.interview.response} compact />
        </div>
      ) : c.stage === "offer" && c.offerResponse === "accepted" ? (
        <p className="mt-2 text-caption font-semibold text-success-fg">✓ Offer accepted</p>
      ) : (
        <p className="mt-2 text-caption text-ink-muted">Applied {timeAgo(c.appliedAt)}</p>
      )}
    </li>
  );
}

function JobDetails({ job }: { job: Job }) {
  return (
    <div className="space-y-5">
      <DefinitionList items={[
        ["Pay", `${formatPay(job.payMin, job.payMax, job.payPeriod)}${job.payType ? ` · ${PAY_TYPE_LABEL[job.payType]}` : ""}`],
        ["Shift", `${SHIFT_LABEL[job.shift]}${job.workHours ? ` · ${job.workHours}` : ""}`],
        ["Experience", EXPERIENCE_LABEL[job.experience]],
        ["Openings", String(job.openings)],
        ["Site / plant", job.siteName ?? ""],
        ["Qualification", job.qualifications.join(", ")],
        ["Licence needed", (job.licences ?? []).join(", ")],
        ["Calls from shortlisted workers", job.allowCalls ? `Allowed · +91 ${job.hrPhone} · ${job.callHours ?? "Anytime"}` : "Off"],
      ]} />
      <BenefitChips benefits={job.benefits} />
      {job.responsibilities.length > 0 && <div><p className="text-caption text-ink-muted">What they'll do</p><ul className="mt-1 list-disc pl-5 text-body">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul></div>}
      {job.requirements.length > 0 && <div><p className="text-caption text-ink-muted">What they need</p><ul className="mt-1 list-disc pl-5 text-body">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul></div>}
    </div>
  );
}
