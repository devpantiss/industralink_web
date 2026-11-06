import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Lock, MapPin, MessageCircle, Phone } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { formatDate, formatDateTime, formatPay } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StageBadge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Misc";
import { Button, LinkButton, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { CompanyLogo } from "@/components/domain/JobBits";
import { ApplicationTimeline } from "@/components/domain/Timeline";

function calendarLink(title: string, at: string, place: string) {
  const start = new Date(at);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(start)}/${f(end)}&location=${encodeURIComponent(place)}`;
}

export default function ApplicationDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: qk.worker.application(id), queryFn: () => workerApi.application(id) });
  const [confirm, setConfirm] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const withdraw = useMutation({
    mutationFn: () => workerApi.withdraw(id),
    onSuccess: () => { setConfirm(false); qc.invalidateQueries({ queryKey: qk.worker.all }); toast.success("Application withdrawn"); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <ListSkeleton count={2} lines={4} />;
  if (q.isError && errorCode(q.error) === "NOT_FOUND") return <EmptyState title="Application not found" action={<LinkButton to="/worker/applications">Back to applications</LinkButton>} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const a = q.data;
  const job = a.job;
  const open = !["hired", "rejected", "withdrawn"].includes(a.stage);
  const quiet = open && a.stage === "applied" && Date.now() - new Date(a.appliedAt).getTime() > 30 * 86_400_000;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/worker/applications" className="inline-block text-small text-ink-muted hover:text-primary">← Back to applications</Link>

      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <CompanyLogo job={job} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-h1">{job.title}</h1><StageBadge stage={a.stage} audience="worker" /></div>
            <p className="text-body text-ink-secondary">{job.companyName} · {job.location.city}</p>
            <p className="text-small text-ink-muted">{formatPay(job.payMin, job.payMax, job.payPeriod)} · Applied {formatDate(a.appliedAt)}</p>
          </div>
          <LinkButton to={`/worker/jobs/${job.id}`} variant="secondary">View job</LinkButton>
        </CardBody>
      </Card>

      {job.status === "closed" && open && <Banner tone="warning">This job has been closed by the employer.</Banner>}
      {quiet && <Banner tone="info">No update yet. You can keep applying to other jobs meanwhile.</Banner>}
      {a.stage === "rejected" && (
        <Banner tone="info" action={<LinkButton to={`/worker/jobs?trade=${job.trade}`} variant="secondary" size="sm">See similar jobs</LinkButton>}>
          Not selected this time. Don't worry, there are more {job.title.toLowerCase()} jobs waiting.
        </Banner>
      )}
      {a.stage === "offer" && <Banner tone="success">You got an offer! 🎉 The employer will call you with the next steps.</Banner>}

      {a.stage === "interview" && a.interview && (
        <Card className="border-interview-fg/30">
          <CardHeader title={<span className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-interview-fg" aria-hidden /> Interview</span>} />
          <CardBody className="space-y-3">
            <p className="text-h3">{formatDateTime(a.interview.at)}</p>
            <p className="flex items-start gap-2 text-body text-ink-secondary"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {a.interview.place}</p>
            <p className="text-small text-ink-muted">Bring your Aadhaar, certificates and 2 passport photos.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a className={buttonClass("secondary", "md")} target="_blank" rel="noreferrer" href={calendarLink(`Interview: ${job.title}`, a.interview.at, a.interview.place)}>Add to calendar</a>
              <a className={buttonClass("secondary", "md")} target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(a.interview.place)}`}>Open in Maps</a>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Progress" />
        <CardBody><ApplicationTimeline app={a} /></CardBody>
      </Card>

      <Card>
        <CardHeader title="Contact the employer" />
        <CardBody>
          {a.contact ? (
            <div className="space-y-3">
              <p className="text-body text-ink-secondary">You're shortlisted, so you can now contact HR{a.contact.hours ? <> between <span className="font-medium text-ink">{a.contact.hours}</span></> : null}.</p>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:+91${a.contact.phone}`} className={buttonClass("primary")}><Phone className="h-4 w-4" aria-hidden /> Call HR</a>
                <a href={`https://wa.me/91${a.contact.phone}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</a>
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-body text-ink-secondary">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              {open ? (job.allowCalls ? "HR's number appears here once you're shortlisted. Until then, the employer will contact you." : "This employer contacts candidates directly. Keep your phone reachable.") : "This application is closed."}
            </p>
          )}
        </CardBody>
      </Card>

      {open && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" className="text-danger-fg hover:bg-danger-bg hover:text-danger-fg" onClick={() => setConfirm(true)}>Withdraw application</Button>
        </div>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => withdraw.mutate()} loading={withdraw.isPending}
        title="Withdraw this application?" confirmLabel="Withdraw"
        message="The employer will no longer see your application, and you can't apply to this job again." />
    </div>
  );
}
