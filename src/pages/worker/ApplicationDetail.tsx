import { useState } from "react";
import { t } from "@/lib/i18n";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Lock, MapPin, MessageCircle, MessageSquare, PartyPopper, Phone, XCircle } from "lucide-react";
import { repliesApi } from "@/api/extra";
import { Field, Textarea } from "@/components/ui/Field";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { formatDate, formatDateTime, formatNumber, formatPay } from "@/lib/format";
import { PAY_TYPE_LABEL } from "@/lib/labels";
import type { Offer } from "@/types";
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
    onSuccess: () => { setConfirm(false); qc.invalidateQueries({ queryKey: qk.worker.all }); toast.success(t("Application withdrawn")); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <ListSkeleton count={2} lines={4} />;
  if (q.isError && errorCode(q.error) === "NOT_FOUND") return <EmptyState title={t("Application not found")} action={<LinkButton to="/worker/applications">{t("Back to applications")}</LinkButton>} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const a = q.data;
  const job = a.job;
  const open = !["hired", "rejected", "withdrawn"].includes(a.stage);
  const canMessage = ["shortlisted", "interview", "offer", "hired"].includes(a.stage);
  const quiet = open && a.stage === "applied" && Date.now() - new Date(a.appliedAt).getTime() > 30 * 86_400_000;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/worker/applications" className="inline-block text-small text-ink-muted hover:text-primary">← {t("Back to applications")}</Link>

      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <CompanyLogo job={job} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-h1">{job.title}</h1><StageBadge stage={a.stage} audience="worker" /></div>
            <p className="text-body text-ink-secondary">{job.companyName} · {job.location.city}</p>
            <p className="text-small text-ink-muted">{formatPay(job.payMin, job.payMax, job.payPeriod)} · {t("Applied {when}", { when: formatDate(a.appliedAt) })}</p>
          </div>
          <LinkButton to={`/worker/jobs/${job.id}`} variant="secondary">{t("View job")}</LinkButton>
        </CardBody>
      </Card>

      {job.status === "closed" && open && <Banner tone="warning">{t("This job has been closed by the employer.")}</Banner>}
      {quiet && <Banner tone="info">{t("No update yet. You can keep applying to other jobs meanwhile.")}</Banner>}
      {a.stage === "rejected" && (
        <Banner tone="info" action={<LinkButton to={`/worker/jobs?trade=${job.trade}`} variant="secondary" size="sm">{t("See similar jobs")}</LinkButton>}>
          {t("Not selected this time. Don't worry, there are more jobs like this waiting.")}
        </Banner>
      )}
      {a.stage === "offer" && <OfferCard appId={a.id} accepted={a.offerResponse === "accepted"} company={job.companyName} offer={a.offer} />}
      {a.stage === "hired" && a.offer && <Banner tone="success" icon={<PartyPopper className="h-5 w-5" />}>{t("Joining date")}: <b>{formatDate(a.offer.joiningDate)}</b> · {a.offer.place}</Banner>}
      {a.stage === "withdrawn" && a.offerResponse === "declined" && <Banner tone="info">{t("You declined this offer. The employer has been told.")}</Banner>}

      {a.stage === "interview" && a.interview && (
        <Card className="border-interview-fg/30">
          <CardHeader title={<span className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-interview-fg" aria-hidden /> {t("Interview")}</span>} />
          <CardBody className="space-y-3">
            <p className="text-h3">{formatDateTime(a.interview.at)}</p>
            <p className="flex items-start gap-2 text-body text-ink-secondary"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {a.interview.place}</p>
            {a.interview.contactPerson && <p className="text-body text-ink-secondary">{t("Ask for")}: <span className="font-medium text-ink">{a.interview.contactPerson}</span></p>}
            <p className="text-small text-ink-muted">{a.interview.bring ? `${t("Bring")}: ${a.interview.bring}` : t("Bring your Aadhaar, certificates and 2 passport photos.")}</p>
            <InterviewReply appId={a.id} response={a.interview.response} note={a.interview.responseNote} />
            <div className="flex flex-wrap gap-2 pt-1">
              <a className={buttonClass("secondary", "md")} target="_blank" rel="noreferrer" href={calendarLink(`Interview: ${job.title}`, a.interview.at, a.interview.place)}>{t("Add to calendar")}</a>
              <a className={buttonClass("secondary", "md")} target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(a.interview.place)}`}>{t("Open in Maps")}</a>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title={t("Progress")} />
        <CardBody><ApplicationTimeline app={a} /></CardBody>
      </Card>

      <Card>
        <CardHeader title={t("Contact the employer")} />
        <CardBody>
          {canMessage && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-soft p-3">
              <p className="text-body text-ink">{t("Ask HR a question about this job.")}</p>
              <LinkButton to={`/worker/messages?c=${a.id}`} icon={<MessageSquare className="h-4 w-4" />}>{t("Message HR")}</LinkButton>
            </div>
          )}
          {a.contact ? (
            <div className="space-y-3">
              <p className="text-body text-ink-secondary">{t("You're shortlisted, so you can now contact HR.")}{a.contact.hours ? <> {t("Call between")} <span className="font-medium text-ink">{a.contact.hours}</span></> : null}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:+91${a.contact.phone}`} className={buttonClass("primary")}><Phone className="h-4 w-4" aria-hidden /> {t("Call HR")}</a>
                <a href={`https://wa.me/91${a.contact.phone}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</a>
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-body text-ink-secondary">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              {open ? (job.allowCalls ? t("HR's number appears here once you're shortlisted. Until then, the employer will contact you.") : t("This employer contacts candidates directly. Keep your phone reachable.")) : t("This application is closed.")}
            </p>
          )}
        </CardBody>
      </Card>

      {open && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" className="text-danger-fg hover:bg-danger-bg hover:text-danger-fg" onClick={() => setConfirm(true)}>{t("Withdraw application")}</Button>
        </div>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => withdraw.mutate()} loading={withdraw.isPending}
        title={t("Withdraw this application?")} confirmLabel={t("Withdraw")}
        message={t("The employer will no longer see your application, and you can't apply to this job again.")} />
    </div>
  );
}

/** "Will you come?" Lets HR know before the day, instead of waiting at the gate. */
function InterviewReply({ appId, response, note }: { appId: string; response?: "attending" | "cant_attend"; note?: string }) {
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState(note ?? "");
  const qc = useQueryClient();
  const toast = useToast();
  const reply = useMutation({
    mutationFn: (r: "attending" | "cant_attend") => repliesApi.interview(appId, r, r === "cant_attend" ? why.trim() : undefined),
    onSuccess: (_d, r) => { setEditing(false); setAsking(false); qc.invalidateQueries({ queryKey: qk.worker.all }); toast.success(r === "attending" ? t("HR knows you're coming") : t("HR will suggest a new time")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (response && !editing) {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-body ${response === "attending" ? "bg-success-bg text-success-fg" : "bg-warning-bg text-warning-fg"}`}>
        <span className="flex items-center gap-2 font-medium">
          {response === "attending" ? <><CheckCircle2 className="h-4 w-4" aria-hidden /> {t("You said you'll attend")}</> : <><XCircle className="h-4 w-4" aria-hidden /> {t("You said you can't attend")}{note ? `: "${note}"` : ""}</>}
        </span>
        <button className="text-small font-semibold underline" onClick={() => setEditing(true)}>{t("Change")}</button>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-body font-semibold text-ink">{t("Will you come?")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button icon={<CheckCircle2 className="h-4 w-4" />} loading={reply.isPending && reply.variables === "attending"} onClick={() => reply.mutate("attending")}>{t("Yes, I'll attend")}</Button>
        <Button variant="secondary" onClick={() => setAsking((v) => !v)} aria-expanded={asking}>{t("Can't make it")}</Button>
      </div>
      {asking && (
        <div className="mt-3 space-y-2">
          <Field label={t("Tell HR why, or a better time (optional)")}>{(id) => <Textarea id={id} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t("e.g. I'm on night shift that day. Can I come on Saturday?")} />}</Field>
          <Button variant="secondary" loading={reply.isPending && reply.variables === "cant_attend"} onClick={() => reply.mutate("cant_attend")}>{t("Send to HR")}</Button>
        </div>
      )}
    </div>
  );
}

function OfferDetails({ offer }: { offer: Offer }) {
  return (
    <dl className="grid gap-2 rounded-lg bg-surface-muted p-3 text-body sm:grid-cols-3">
      <div><dt className="text-caption text-ink-muted">{t("Pay")}</dt><dd className="font-semibold text-ink">₹{formatNumber(offer.pay)} / {t(offer.payPeriod)}{offer.payType ? ` · ${t(PAY_TYPE_LABEL[offer.payType])}` : ""}</dd></div>
      <div><dt className="text-caption text-ink-muted">{t("Joining date")}</dt><dd className="font-semibold text-ink">{formatDate(offer.joiningDate)}</dd></div>
      <div><dt className="text-caption text-ink-muted">{t("Report at")}</dt><dd className="font-semibold text-ink">{offer.place}</dd></div>
      {offer.note && <div className="sm:col-span-3"><dt className="text-caption text-ink-muted">{t("Note from HR")}</dt><dd className="text-ink">{offer.note}</dd></div>}
    </dl>
  );
}

function OfferCard({ appId, accepted, company, offer }: { appId: string; accepted: boolean; company: string; offer?: Offer }) {
  const [declining, setDeclining] = useState(false);
  const [why, setWhy] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const reply = useMutation({
    mutationFn: (r: "accepted" | "declined") => repliesApi.offer(appId, r, why.trim() || undefined),
    onSuccess: (_d, r) => { setDeclining(false); qc.invalidateQueries({ queryKey: qk.worker.all }); toast.success(r === "accepted" ? t("Offer accepted. Congratulations!") : t("Offer declined")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (accepted) {
    return (
      <Card className="border-success-fg/30">
        <CardBody className="space-y-3">
          <p className="flex items-center gap-2 text-h3 text-ink"><PartyPopper className="h-5 w-5 text-success-fg" aria-hidden /> {offer ? t("You accepted the offer from {company}.", { company }) : t("You accepted the offer from {company}. HR will call you with your joining date.", { company })}</p>
          {offer && <OfferDetails offer={offer} />}
        </CardBody>
      </Card>
    );
  }
  return (
    <Card className="border-success-fg/30">
      <CardBody className="space-y-3">
        <p className="flex items-center gap-2 text-h3 text-ink"><PartyPopper className="h-5 w-5 text-success-fg" aria-hidden /> {t("{company} sent you an offer!", { company })}</p>
        {offer && <OfferDetails offer={offer} />}
        <p className="text-body text-ink-secondary">{t("Tell them if you'll take the job. Accept only if you plan to join.")}</p>
        <div className="flex flex-wrap gap-2">
          <Button loading={reply.isPending && reply.variables === "accepted"} onClick={() => reply.mutate("accepted")}>{t("Accept offer")}</Button>
          <Button variant="secondary" onClick={() => setDeclining(true)}>{t("Decline")}</Button>
        </div>
      </CardBody>
      <ConfirmDialog open={declining} onClose={() => setDeclining(false)} onConfirm={() => reply.mutate("declined")} loading={reply.isPending}
        title={t("Decline this offer?")} confirmLabel={t("Decline offer")}
        message={t("The employer will be told, and this application will close.")}>
        <Field label={t("Reason (optional)")} className="mt-3">{(id) => <Textarea id={id} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={t("e.g. Got a job closer to home")} />}</Field>
      </ConfirmDialog>
    </Card>
  );
}
