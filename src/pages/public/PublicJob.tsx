import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { LogoMark } from "@/components/ui/Logo";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock, Factory, GraduationCap, MapPin, ShieldCheck, Users, Wallet } from "lucide-react";
import { publicApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { errorCode } from "@/api/client";
import { useAuth } from "@/app/AuthContext";
import { EXPERIENCE_LABEL, PAY_TYPE_LABEL, SECTOR_LABEL, SHIFT_LABEL } from "@/lib/labels";
import { formatDate, formatPay, timeAgo } from "@/lib/format";
import { setNext } from "@/lib/next";
import { Button, LinkButton } from "@/components/ui/Button";
import { VerifiedTick } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Misc";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { BenefitChips, CompanyLogo, jobTypeText } from "@/components/domain/JobBits";
import { FullPageLoader } from "@/app/guards";
import { LangToggle, t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * The page a shared job link opens. Works without logging in, so a worker
 * who gets the link on WhatsApp sees the job first. Apply → log in or sign
 * up → back on the same job with the apply form open.
 */
export default function PublicJob() {
  const { id = "" } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: qk.publicJob(id), queryFn: () => publicApi.job(id), retry: (n, e) => errorCode(e) !== "NOT_FOUND" && n < 2, enabled: !loading && user?.role !== "worker" });

  if (loading) return <FullPageLoader />;
  if (user?.role === "worker") return <Navigate to={`/worker/jobs/${id}`} replace />;

  const apply = () => {
    setNext(`/worker/jobs/${id}?apply=1`);
    navigate("/login?as=worker");
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/login" className="flex items-center gap-2.5" aria-label="IndustriaLink">
            <LogoMark />
            <span className="text-h3 font-semibold">IndustriaLink</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/jobs" className="text-body font-medium text-ink-secondary hover:text-ink">{t("All jobs")}</Link>
            {!user && <Link to="/login?as=worker" className="text-body font-medium text-primary hover:underline">{t("Log in")}</Link>}
            <LangToggle />
            <ThemeToggle className="h-9 w-9" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:pb-10">
        {q.isLoading ? <ListSkeleton count={2} lines={5} /> : q.isError && errorCode(q.error) === "NOT_FOUND" ? (
          <EmptyState title={t("Job not found")} description={t("This job was removed or the link is wrong.")} action={<LinkButton to="/jobs">{t("See other jobs")}</LinkButton>} />
        ) : q.isError || !q.data ? <ErrorState onRetry={() => q.refetch()} /> : (() => {
          const job = q.data;
          const closed = job.status !== "active" || (!!job.deadline && new Date(job.deadline) < new Date());
          return (
            <>
              {user && <div className="mb-4"><Banner tone="info">{t(user.role === "employer" ? "You're logged in as an employer. Workers apply from their own account." : "You're logged in as admin. Workers apply from their own account.")}</Banner></div>}
              {closed && <div className="mb-4"><Banner tone="warning">{t("This job is no longer accepting applications.")}</Banner></div>}
              <article className="rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-6">
                <div className="flex gap-4">
                  <CompanyLogo job={job} size="lg" />
                  <div className="min-w-0">
                    <h1 className="text-h1 text-ink">{job.title}</h1>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-body text-ink-secondary">{job.companyName} <VerifiedTick verified={job.companyVerified} /></p>
                    <p className="text-small text-ink-muted">{t(SECTOR_LABEL[job.sector])} · {t("Posted {time}", { time: timeAgo(job.postedAt) })}</p>
                  </div>
                </div>
                <dl className="mt-6 grid gap-4 rounded-lg bg-surface-muted p-4 sm:grid-cols-2">
                  <Fact icon={Wallet} label={job.payType && (job.payMin || job.payMax) ? `${t("Pay")} · ${t(PAY_TYPE_LABEL[job.payType])}` : t("Pay")} value={formatPay(job.payMin, job.payMax, job.payPeriod, true)} />
                  <Fact icon={MapPin} label={t("Work location")} value={[job.address, job.location.city, job.location.state, job.pincode].filter(Boolean).join(", ")} />
                  {job.siteName && <Fact icon={Factory} label={t("Site / plant")} value={job.siteName} />}
                  <Fact icon={Clock} label={t("Shift")} value={`${t(SHIFT_LABEL[job.shift])} · ${jobTypeText(job)}`} />
                  {job.workHours && <Fact icon={Clock} label={t("Working hours")} value={job.workHours} />}
                  <Fact icon={Users} label={t("Openings")} value={`${job.openings} ${t("people")} · ${t(EXPERIENCE_LABEL[job.experience])}`} />
                  {job.qualifications.length > 0 && <Fact icon={GraduationCap} label={t("Qualification")} value={job.qualifications.join(", ")} />}
                  {!!job.licences?.length && <Fact icon={GraduationCap} label={t("Licence needed")} value={job.licences.join(", ")} />}
                  {job.deadline && <Fact icon={CalendarClock} label={t("Last date to apply")} value={formatDate(job.deadline)} />}
                </dl>
                {job.benefits.length > 0 && <div className="mt-5"><h2 className="mb-2 text-h3">{t("Benefits")}</h2><BenefitChips benefits={job.benefits} /></div>}
                {job.responsibilities.length > 0 && <List title={t("What you'll do")} items={job.responsibilities} />}
                {job.requirements.length > 0 && <List title={t("What you need")} items={job.requirements} />}
                <div className="mt-6 flex items-start gap-3 rounded-lg border border-success-fg/20 bg-success-bg p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-fg" aria-hidden />
                  <p className="text-body text-ink"><span className="font-semibold">{t("IndustriaLink never asks for money.")}</span> {t("Don't pay anyone for a job or \"registration\".")}</p>
                </div>
                {!user && !closed && (
                  <div className="mt-6 hidden items-center justify-between gap-4 border-t border-border pt-5 sm:flex">
                    <p className="text-small text-ink-secondary">{t("Log in or sign up with your mobile number. Takes 30 seconds.")}</p>
                    <Button size="lg" onClick={apply}>{t("Apply now")}</Button>
                  </div>
                )}
              </article>
              {!user && !closed && (
                <div className="glass fixed inset-x-3 bottom-3 z-20 flex flex-col gap-1 rounded-2xl border p-2.5 sm:hidden">
                  <Button size="lg" onClick={apply}>{t("Apply now")}</Button>
                  <p className="text-center text-caption text-ink-muted">{t("Sign up with your mobile number. Takes 30 seconds.")}</p>
                </div>
              )}
            </>
          );
        })()}
      </main>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
      <div><dt className="text-caption text-ink-muted">{label}</dt><dd className="text-body text-ink">{value}</dd></div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-h3">{title}</h2>
      <ul className="space-y-1.5">{items.map((r) => <li key={r} className="flex gap-2 text-body text-ink-secondary"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" aria-hidden />{r}</li>)}</ul>
    </div>
  );
}
