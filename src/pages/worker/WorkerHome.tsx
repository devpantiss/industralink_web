import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Mic, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { t } from "@/lib/i18n";
import { workerApi } from "@/api/worker";
import { accountApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { useUser } from "@/app/AuthContext";
import { EXPERIENCE_LABEL, TRADE_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Avatar, ProgressBar } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { JobCard } from "@/components/domain/JobCard";
import { JobDetailPanel } from "@/components/domain/JobDetailPanel";
import { ApplyDrawer, ReportDialog } from "@/components/domain/JobActions";
import { useSaveJob } from "@/hooks/useSaveJob";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

/**
 * Worker dashboard: jobs list on the left, the picked job in the middle, profile on the right.
 * On phones and tablets the middle column is hidden and a job opens its own page.
 */
export default function WorkerHome() {
  const user = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const wide = useMediaQuery("(min-width: 1024px)");
  const summary = useQuery({ queryKey: qk.worker.summary, queryFn: workerApi.summary });
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
  const trade = profile.data?.trade;
  const forYou = useQuery({
    queryKey: qk.worker.jobs({ forYou: trade }),
    queryFn: () => workerApi.searchJobs({ trade, sort: "nearest" }),
    enabled: profile.isSuccess,
  });
  const latest = useQuery({ queryKey: qk.worker.jobs({ latest: true }), queryFn: () => workerApi.searchJobs({ sort: "newest" }) });
  const { toggle, pendingId } = useSaveJob();

  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string>();
  const [applyOpen, setApplyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const voice = useVoiceSearch((text) => setQ(text), (msg) => toast.error(t(msg)));

  // Jobs for your trade first, then other new jobs, without repeats.
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...(forYou.data?.items ?? []), ...(latest.data?.items ?? [])].filter((j) => !seen.has(j.id) && seen.add(j.id));
  }, [forYou.data, latest.data]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? all.filter((j) => `${j.title} ${j.companyName} ${j.location.city} ${j.location.state}`.toLowerCase().includes(s)) : all;
  }, [all, q]);
  const selected = list.find((j) => j.id === selId) ?? list[0];

  const loading = profile.isLoading || latest.isLoading || (profile.isSuccess && forYou.isLoading);
  const pick = (id: string) => (wide ? setSelId(id) : navigate(`/worker/jobs/${id}`));
  const submit = (e: FormEvent) => { e.preventDefault(); if (!list.length && q.trim()) navigate(`/worker/jobs?q=${encodeURIComponent(q.trim())}`); };
  const s = summary.data;
  const first = user.name.split(" ")[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">{t("Welcome back, {name}. Let's find your next job.", { name: first })}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {trade && profile.data?.location
            ? t("Jobs matched to your trade ({trade}) and location ({city}).", { trade: t(TRADE_LABEL[trade]), city: profile.data.location.city })
            : t("New verified jobs are added every day.")}
        </p>
      </div>

      {s?.nextStep && (
        <Link to={s.nextStep.link} className="flex items-center gap-3 rounded-xl bg-tile-purple px-4 py-3 text-tile-purple-ink transition-opacity hover:opacity-90">
          <CalendarClock className="h-5 w-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 text-small"><b className="font-bold">{t(s.nextStep.title)}</b>{s.nextStep.at ? ` · ${formatDateTime(s.nextStep.at)}` : ""} · {s.nextStep.subtitle}</span>
          <span className="hidden items-center gap-1 text-small font-bold sm:inline-flex">{t("View details")} <ArrowRight className="h-4 w-4" aria-hidden /></span>
        </Link>
      )}

      <form onSubmit={submit} role="search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[320px_minmax(0,1fr)_auto]">
        <div className="hidden h-[50px] items-center justify-between gap-3 rounded-full bg-ink-fill px-5 text-on-ink lg:flex">
          <b className="text-[15px]">{q ? t("Search result") : t("Jobs for you")}</b>
          <span className="text-caption text-on-ink/70" aria-live="polite">{loading ? t("Searching…") : t(list.length === 1 ? "{n} job found" : "{n} jobs found", { n: list.length })}</span>
        </div>
        <label className="flex h-[50px] min-w-0 items-center gap-2.5 rounded-full border border-transparent bg-surface-muted pl-5 pr-1.5 transition-colors focus-within:border-primary focus-within:bg-surface">
          <Search className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
          <span className="sr-only">{t("Search jobs")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search welder, driver, fitter, company…")} className="min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-muted" />
          <button type="button" onClick={voice.start} aria-label={voice.listening ? t("Stop listening") : t("Search by voice")} aria-pressed={voice.listening}
            className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors", voice.listening ? "bg-danger-fg text-white" : "text-ink-secondary hover:bg-surface-strong")}>
            <Mic className={cn("h-[18px] w-[18px]", voice.listening && "animate-pulse")} aria-hidden />
          </button>
        </label>
        <Link to={q.trim() ? `/worker/jobs?q=${encodeURIComponent(q.trim())}` : "/worker/jobs"} aria-label={t("More filters")} title={t("More filters")}
          className="hidden h-[50px] w-[50px] items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-surface-strong sm:flex">
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
        </Link>
      </form>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        {/* Jobs list */}
        <div className="space-y-3">
          {loading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[230px] rounded-xl" />)
            : latest.isError ? <ErrorState onRetry={() => latest.refetch()} />
            : list.length === 0 ? (
              <EmptyState icon={<Search className="h-6 w-6" />} title={q ? t("No jobs match \"{q}\"", { q }) : t("No jobs yet")}
                description={q ? t("Try another trade, like welder or driver.") : t("New jobs are added every day. Check back soon.")}
                action={<LinkButton to={q ? `/worker/jobs?q=${encodeURIComponent(q)}` : "/worker/jobs"} variant="secondary">{t("Search all jobs")}</LinkButton>} />
            ) : list.map((j) => (
              <JobCard key={j.id} job={j} onToggleSave={toggle} saving={pendingId === j.id} selected={wide && selected?.id === j.id} onSelect={(job) => pick(job.id)} />
            ))}
          {!loading && list.length > 0 && (
            <Link to="/worker/jobs" className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-body font-semibold text-primary transition-colors hover:bg-primary-soft">{t("See all jobs")} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          )}
        </div>

        {/* Picked job (desktop only) */}
        {wide && (
          <section className="sticky top-24 rounded-2xl bg-surface-muted p-6" aria-label={t("Job details")}>
            {selected ? (
              <div key={selected.id} className="animate-rise">
                <JobDetailPanel job={selected} onToggleSave={toggle} saving={pendingId === selected.id} onApply={() => setApplyOpen(true)} onReport={() => setReportOpen(true)} />
              </div>
            ) : loading ? <Skeleton className="h-[520px] rounded-xl" /> : <p className="py-16 text-center text-body text-ink-muted">{t("Pick a job to see the details.")}</p>}
          </section>
        )}

        {/* Profile column */}
        <ProfileColumn />
      </div>

      {selected && (
        <>
          <ApplyDrawer open={applyOpen && !selected.appliedApplicationId} onClose={() => setApplyOpen(false)} jobId={selected.id} title={`${selected.title} – ${selected.companyName}`} />
          <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} jobId={selected.id} />
        </>
      )}
    </div>
  );
}

function ProfileColumn() {
  const user = useUser();
  const summary = useQuery({ queryKey: qk.worker.summary, queryFn: workerApi.summary });
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
  const apps = useQuery({ queryKey: qk.worker.applications, queryFn: workerApi.applications });
  const s = summary.data, p = profile.data;

  // Applications per stage, as a small bar chart drawn from real data.
  const stages = [
    { key: "applied", label: t("Applied"), color: "bg-tile-blue-ink" },
    { key: "shortlisted", label: t("Shortlisted"), color: "bg-primary" },
    { key: "interview", label: t("Interview"), color: "bg-tile-purple-ink" },
    { key: "offer", label: t("Offer"), color: "bg-tile-green-ink" },
  ];
  const counts = stages.map((st) => (apps.data ?? []).filter((a) => a.stage === st.key || (st.key === "offer" && a.stage === "hired")).length);
  const max = Math.max(1, ...counts);

  return (
    <aside className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:col-span-1 xl:grid-cols-1" aria-label={t("Your profile")}>
      <div className="flex flex-col items-center rounded-2xl bg-surface-muted p-5 text-center sm:row-span-2 xl:row-span-1">
        <Avatar name={user.name} src={p?.photoUrl} size="xl" />
        <p className="mt-3 text-h3 font-bold text-ink">{user.name}</p>
        <p className="text-small text-ink-secondary">{p?.trade ? t(TRADE_LABEL[p.trade]) : t("Worker")}{p?.experience ? ` · ${t(EXPERIENCE_LABEL[p.experience])}` : ""}</p>
        {p?.location && <p className="text-caption text-ink-muted">{p.location.city}, {p.location.state}</p>}
        <LinkButton to="/worker/profile" variant="secondary" className="mt-4 w-full rounded-full">{t("Edit profile")}</LinkButton>
        {s && (
          <div className="mt-4 w-full border-t border-border pt-4 text-left">
            <div className="mb-1.5 flex justify-between text-small font-semibold"><span>{t("Profile strength")}</span><span className="tabular">{s.profileStrength}%</span></div>
            <ProgressBar value={s.profileStrength} label={t("Profile strength")} />
            {s.profileHint && s.missing[0] && <Link to={s.missing[0].link} className="mt-1.5 block text-caption text-ink-muted hover:text-primary">{t("Next: {item}", { item: t(s.profileHint) })} →</Link>}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-surface-muted p-5">
        <p className="flex items-center gap-2 text-small font-semibold text-ink-secondary"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden />{t("Your applications")}</p>
        <ul className="mt-3 space-y-2.5">
          {stages.map((st, i) => (
            <li key={st.key}>
              <div className="mb-1 flex justify-between text-caption"><span className="text-ink-secondary">{st.label}</span><b className="tabular text-ink">{counts[i]}</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-strong"><div className={cn("origin-left-grow h-full rounded-full", st.color)} style={{ width: `${(counts[i]! / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MiniStat to="/worker/applications" label={t("Applied")} value={s?.activeApplications} unit={t("active")} />
        <MiniStat to="/worker/applications?tab=interviews" label={t("Interviews")} value={s?.interviews} unit={t("coming up")} />
        <MiniStat to="/worker/saved" label={t("Saved")} value={s?.saved} unit={t("jobs")} />
        <MiniStat to="/worker/profile" label={t("Experience")} value={p?.experience ? t(EXPERIENCE_LABEL[p.experience]) : "–"} />
      </div>

      <AlertsCard />
    </aside>
  );
}

function MiniStat({ to, label, value, unit }: { to: string; label: string; value?: number | string; unit?: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center rounded-2xl bg-surface-muted px-2 py-4 text-center transition-colors hover:bg-surface-strong">
      <span className="text-caption font-medium text-ink-secondary">{label}</span>
      <span className={cn("font-extrabold leading-tight text-ink tabular", typeof value === "number" ? "text-[26px]" : "text-body-lg")}>{value ?? "–"}</span>
      {unit && <span className="text-caption text-ink-muted">{unit}</span>}
    </Link>
  );
}

/** Real setting: turns WhatsApp job alerts on or off (Settings → Notifications). */
function AlertsCard() {
  const qc = useQueryClient();
  const toast = useToast();
  const settings = useQuery({ queryKey: qk.settings, queryFn: accountApi.settings });
  const on = !!settings.data?.whatsappAlerts && !!settings.data?.jobAlerts;
  const save = useMutation({
    mutationFn: (v: boolean) => accountApi.updateSettings(v ? { whatsappAlerts: true, jobAlerts: true } : { whatsappAlerts: false }),
    onSuccess: (d) => { qc.setQueryData(qk.settings, d); toast.success(d.whatsappAlerts ? t("WhatsApp job alerts turned on") : t("WhatsApp job alerts turned off")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-4 sm:col-span-2 xl:col-span-1">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tile-green text-tile-green-ink"><MessageCircle className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-small font-bold text-ink">{t("Job alerts on WhatsApp")}</span>
        <span className="block text-caption text-ink-muted">{t("New jobs for your trade, near you")}</span>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={t("Job alerts on WhatsApp")} disabled={settings.isLoading || save.isPending} onClick={() => save.mutate(!on)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50", on ? "bg-primary" : "bg-border-strong")}>
        <span className={cn("absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-xs transition-transform duration-200", on && "translate-x-5")} />
      </button>
    </div>
  );
}
