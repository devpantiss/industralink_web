import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, Clock, Factory, Flag, GraduationCap, Heart, MapPin, Phone, Share2, ShieldCheck, Users, Wallet } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { EXPERIENCE_LABEL, JOB_TYPE_LABEL, SECTOR_LABEL, SHIFT_LABEL } from "@/lib/labels";
import { formatDate, formatPay, timeAgo } from "@/lib/format";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Misc";
import { VerifiedTick } from "@/components/ui/Badge";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BenefitChips, CompanyLogo } from "@/components/domain/JobBits";
import { useSaveJob } from "@/hooks/useSaveJob";
import { cn } from "@/lib/cn";

export default function JobDetail() {
  const { id = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = useQuery({ queryKey: qk.worker.job(id), queryFn: () => workerApi.job(id), retry: (n, e) => errorCode(e) !== "NOT_FOUND" && n < 2 });
  const { toggle, pendingId } = useSaveJob();
  const toast = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const applyOpen = sp.get("apply") === "1";
  const setApply = (open: boolean) => { const n = new URLSearchParams(sp); open ? n.set("apply", "1") : n.delete("apply"); setSp(n, { replace: true }); };

  if (q.isLoading) return <ListSkeleton count={2} lines={5} />;
  if (q.isError && errorCode(q.error) === "NOT_FOUND")
    return <EmptyState title="Job not found" description="This job was removed or the link is wrong." action={<LinkButton to="/worker/jobs">Find other jobs</LinkButton>} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;

  const job = q.data;
  const closed = job.status !== "active" || (!!job.deadline && new Date(job.deadline) < new Date());
  const walkInOver = job.jobType === "walk_in" && job.walkIn && new Date(`${job.walkIn.date}T23:59`) < new Date();
  const shareText = encodeURIComponent(`${job.title} at ${job.companyName}, ${job.location.city}. ${formatPay(job.payMin, job.payMax, job.payPeriod)}. ${window.location.origin}/worker/jobs/${job.id}`);

  const actions = closed ? (
    <p className="text-body font-medium text-ink-muted">This job is closed</p>
  ) : job.appliedApplicationId ? (
    <LinkButton to={`/worker/applications/${job.appliedApplicationId}`} variant="secondary" size="lg" icon={<CheckCircle2 className="h-5 w-5 text-success-fg" />}>Applied · Track it</LinkButton>
  ) : (
    <Button size="lg" className="flex-1 sm:flex-none sm:px-8" onClick={() => setApply(true)}>Apply now</Button>
  );

  return (
    <div className="mx-auto max-w-3xl pb-20 sm:pb-0">
      <Link to="/worker/jobs" className="mb-4 inline-block text-small text-ink-muted hover:text-primary">← Back to jobs</Link>

      {closed && <div className="mb-4"><Banner tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>This job is no longer accepting applications.</Banner></div>}

      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="flex gap-4">
            <CompanyLogo job={job} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-h1 text-ink">{job.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-body text-ink-secondary">
                <Link to={`/worker/companies/${job.companyId}`} className="font-medium hover:text-primary hover:underline">{job.companyName}</Link> <VerifiedTick verified={job.companyVerified} />
              </p>
              <p className="mt-1 text-small text-ink-muted">{SECTOR_LABEL[job.sector]} · Posted {timeAgo(job.postedAt)}</p>
            </div>
            <button onClick={() => toggle(job)} disabled={pendingId === job.id} aria-pressed={job.saved} aria-label={job.saved ? "Remove from saved" : "Save job"}
              className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border hover:bg-surface-muted", job.saved ? "text-danger-fg" : "text-ink-muted")}>
              <Heart className={cn("h-5 w-5", job.saved && "fill-current")} />
            </button>
          </div>

          <dl className="mt-6 grid gap-4 rounded-lg bg-surface-muted p-4 sm:grid-cols-2">
            <Fact icon={Wallet} label="Pay" value={formatPay(job.payMin, job.payMax, job.payPeriod, true)} strong />
            <Fact icon={MapPin} label="Work location" value={`${job.location.city}, ${job.location.state}`} />
            {job.siteName && <Fact icon={Factory} label="Site / plant" value={job.siteName} />}
            <Fact icon={Clock} label="Shift" value={`${SHIFT_LABEL[job.shift]} · ${JOB_TYPE_LABEL[job.jobType]}`} />
            <Fact icon={Users} label="Openings" value={`${job.openings} people · ${EXPERIENCE_LABEL[job.experience]}`} />
            {job.qualifications.length > 0 && <Fact icon={GraduationCap} label="Qualification" value={job.qualifications.join(", ")} />}
            {job.deadline && <Fact icon={CalendarClock} label="Last date to apply" value={formatDate(job.deadline)} />}
          </dl>

          {job.benefits.length > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-h3">Benefits</h2>
              <BenefitChips benefits={job.benefits} />
            </div>
          )}

          {job.jobType === "walk_in" && job.walkIn && (
            <div className={cn("mt-5 rounded-lg border p-4", walkInOver ? "border-border bg-surface-muted" : "border-interview-fg/30 bg-interview-bg")}>
              <h2 className="flex items-center gap-2 text-h3"><CalendarClock className="h-5 w-5 text-interview-fg" aria-hidden /> Walk-in interview</h2>
              {walkInOver ? <p className="mt-1 text-body text-ink-muted">The walk-in date is over.</p> : (
                <>
                  <p className="mt-1 text-body text-ink">{formatDate(job.walkIn.date)} at {job.walkIn.time}</p>
                  <p className="text-body text-ink-secondary">{job.walkIn.address}</p>
                  <a className="mt-2 inline-block text-small font-medium text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(job.walkIn.address)}`}>Open in Maps</a>
                </>
              )}
            </div>
          )}

          {job.responsibilities.length > 0 && <Section title="What you'll do" items={job.responsibilities} />}
          {job.requirements.length > 0 && <Section title="What you need" items={job.requirements} />}

          <div className="mt-6 flex items-start gap-3 rounded-lg border border-info-fg/20 bg-info-bg p-4">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-info-fg" aria-hidden />
            <p className="text-body text-ink">
              {job.allowCalls ? <>Once you're <span className="font-semibold">shortlisted</span>, you'll get the HR's number{job.callHours ? ` (calls ${job.callHours})` : ""}.</> : "The employer will contact you if you're shortlisted."}
            </p>
          </div>

          <div className="mt-3 flex items-start gap-3 rounded-lg border border-success-fg/20 bg-success-bg p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-fg" aria-hidden />
            <p className="text-body text-ink"><span className="font-semibold">IndustriaLink never asks for money.</span> Don't pay anyone for a job or "registration".</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-small">
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"><Share2 className="h-4 w-4" aria-hidden /> Share on WhatsApp</a>
            <Link to={`/worker/companies/${job.companyId}`} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"><Building2 className="h-4 w-4" aria-hidden /> More jobs at {job.companyName}</Link>
            <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 font-medium text-ink-muted hover:text-danger-fg"><Flag className="h-4 w-4" aria-hidden /> Report this job</button>
          </div>

          <div className="mt-6 hidden items-center justify-end gap-2 border-t border-border pt-5 sm:flex">{actions}</div>
        </CardBody>
      </Card>

      {/* Sticky action bar on mobile */}
      <div className="glass fixed inset-x-3 bottom-[88px] z-20 flex gap-2 rounded-2xl border p-2.5 sm:hidden">{actions}</div>

      <ApplyDrawer open={applyOpen && !closed && !job.appliedApplicationId} onClose={() => setApply(false)} jobId={job.id} title={`${job.title} – ${job.companyName}`} />

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this job?"
        footer={<>
          <Button variant="secondary" onClick={() => setReportOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setReportOpen(false); toast.success("Thanks. Our team will check this job."); }}>Report</Button>
        </>}>
        Tell us if this job asks for money, looks fake, or the details are wrong. Our team will check it.
      </Modal>
    </div>
  );
}

function Fact({ icon: Icon, label, value, strong }: { icon: typeof Wallet; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
      <div>
        <dt className="text-caption text-ink-muted">{label}</dt>
        <dd className={cn("text-body text-ink", strong && "text-body-lg font-semibold")}>{value}</dd>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-h3">{title}</h2>
      <ul className="space-y-1.5">
        {items.map((r) => <li key={r} className="flex gap-2 text-body text-ink-secondary"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" aria-hidden />{r}</li>)}
      </ul>
    </div>
  );
}

function ApplyDrawer({ open, onClose, jobId, title }: { open: boolean; onClose: () => void; jobId: string; title: string }) {
  const docs = useQuery({ queryKey: qk.worker.documents, queryFn: workerApi.documents, enabled: open });
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile, enabled: open });
  const resumes = docs.data?.filter((d) => d.type === "resume") ?? [];
  const [choice, setChoice] = useState<string>("profile");
  const [doneId, setDoneId] = useState<string>();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const apply = useMutation({
    mutationFn: () => workerApi.apply(jobId, choice === "profile" ? { sentWith: "profile" } : { sentWith: "document", documentId: choice }),
    onSuccess: (a) => { setDoneId(a.id); qc.invalidateQueries({ queryKey: qk.worker.all }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const close = () => { setDoneId(undefined); onClose(); };

  if (doneId) {
    return (
      <Drawer open={open || !!doneId} onClose={close} title="Application sent">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success-fg"><CheckCircle2 className="h-9 w-9" aria-hidden /></span>
          <h3 className="mt-4 text-h2">Applied!</h3>
          <p className="mt-1 max-w-xs text-body text-ink-secondary">We'll tell you when the employer replies. You can track it in Applications.</p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button size="lg" onClick={() => navigate(`/worker/applications/${doneId}`)}>Track application</Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/worker/jobs")}>Find more jobs</Button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onClose={close} title="Apply" subtitle={title}
      footer={<Button size="lg" className="w-full" onClick={() => apply.mutate()} loading={apply.isPending} loadingText="Sending…">Send application</Button>}>
      <fieldset>
        <legend className="text-h3">What should we send?</legend>
        <div className="mt-3 space-y-2">
          <Option checked={choice === "profile"} onChange={() => setChoice("profile")} title="My IndustriaLink profile" text="Your trade, experience, skills and documents. Recommended." />
          {resumes.map((r) => (
            <Option key={r.id} checked={choice === r.id} onChange={() => setChoice(r.id)} title={r.name} text={r.isDefaultResume ? "Your default resume" : "Resume"} />
          ))}
        </div>
        {resumes.length === 0 && !docs.isLoading && (
          <p className="mt-3 text-small text-ink-muted">No resume? No problem. Your profile works as your resume. <Link to="/worker/profile?tab=documents" className="text-primary hover:underline">Upload one</Link></p>
        )}
      </fieldset>
      <div className="mt-6 rounded-lg bg-surface-muted p-4">
        <p className="text-caption text-ink-muted">Employer will call you on</p>
        <p className="text-body font-medium text-ink">+91 {profile.data?.phone ?? "…"} <span className="text-success-fg">✓ verified</span></p>
      </div>
    </Drawer>
  );
}

function Option({ checked, onChange, title, text }: { checked: boolean; onChange: () => void; title: string; text: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors", checked ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong")}>
      <input type="radio" name="sendWith" checked={checked} onChange={onChange} className="mt-1 accent-[rgb(var(--primary))]" />
      <span>
        <span className="block text-body font-medium text-ink">{title}</span>
        <span className="block text-small text-ink-secondary">{text}</span>
      </span>
    </label>
  );
}
