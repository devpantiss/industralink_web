import { useState } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Download, ExternalLink, FileImage, FileText, MapPin, MessageCircle, Phone, Printer, Star } from "lucide-react";
import type { ApplicationStage, Candidate, WorkerDocument } from "@/types";
import { AVAILABILITY_LABEL, DOC_TYPE_LABEL, EMPLOYMENT_TYPE_LABEL, EXPERIENCE_LABEL, PIPELINE_STAGES, SHIFT_LABEL, STAGE_LABEL, TRADE_LABEL } from "@/lib/labels";
import { formatBytes, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { cn } from "@/lib/cn";
import { Avatar, DefinitionList, Tabs } from "@/components/ui/Misc";
import { Badge, StageBadge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ConfirmDialog, Drawer, Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";

/* ---------------- Document preview ---------------- */

export function DocumentPreview({ doc, tall }: { doc: WorkerDocument; tall?: boolean }) {
  const isImage = doc.mimeType.startsWith("image/") || doc.url?.endsWith(".svg");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className={cn("bg-surface-muted", tall ? "h-[460px]" : "h-64")}>
        {!doc.url ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-small text-ink-muted">Preview not available. The file wasn't saved in this demo.</div>
        ) : isImage ? (
          <img src={doc.url} alt={doc.name} className="h-full w-full object-contain" />
        ) : (
          <iframe src={`${doc.url}#toolbar=0&view=FitH`} title={doc.name} className="h-full w-full" />
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-border px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-small"><span className="font-medium text-ink">{DOC_TYPE_LABEL[doc.type]}</span> <span className="text-ink-muted">· {doc.name}</span></span>
        {doc.url && (
          <>
            <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline">Open <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
            <a href={doc.url} download={doc.name} className="inline-flex items-center gap-1 text-small font-medium text-primary hover:underline">Download <Download className="h-3.5 w-3.5" aria-hidden /></a>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Candidate drawer ---------------- */

/** Worker's answer to the interview invite, for HR. */
export function ReplyBadge({ response, compact }: { response?: "attending" | "cant_attend"; compact?: boolean }) {
  if (response === "attending") return <Badge tone="success">{compact ? "✓ Coming" : "✓ Will attend"}</Badge>;
  if (response === "cant_attend") return <Badge tone="warning">{compact ? "Can't come" : "Can't attend"}</Badge>;
  return <Badge tone="neutral">{compact ? "No reply" : "No reply yet"}</Badge>;
}

type PanelTab = "resume" | "profile" | "activity";

export function CandidateDrawer({ c, onClose, onMove, moving, showJob }: { c: Candidate; onClose: () => void; onMove: (s: ApplicationStage) => void; moving: boolean; showJob?: boolean }) {
  const w = c.worker;
  const idx = PIPELINE_STAGES.indexOf(c.stage);
  const nextStage = idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : undefined;
  const closed = c.stage === "withdrawn" || c.stage === "hired" || c.stage === "rejected";
  const sent = c.documents.find((d) => d.id === c.documentId);
  const resumes = c.documents.filter((d) => d.type === "resume");
  const others = c.documents.filter((d) => d.type !== "resume");
  const [tab, setTab] = useState<PanelTab>("resume");
  const [docId, setDocId] = useState<string | undefined>(sent?.id ?? resumes[0]?.id);
  const shownDoc = c.documents.find((d) => d.id === docId);

  return (
    <Drawer open onClose={onClose} width="max-w-[640px]"
      title={<span className="flex items-center gap-3"><Avatar name={w.name} /> <span className="min-w-0"><span className="block truncate">{w.name}</span><span className="block text-small font-normal text-ink-muted">{w.trade ? TRADE_LABEL[w.trade] : "Worker"} · {w.experience ? EXPERIENCE_LABEL[w.experience] : "—"} · {w.location?.city ?? "—"}</span></span></span>}
      subtitle={<span className="flex flex-wrap items-center gap-2">{showJob && <span>For <span className="font-medium text-ink">{c.jobTitle}</span> ·</span>} <StageBadge stage={c.stage} /> <span>Applied {formatDate(c.appliedAt)}</span></span>}
      footer={closed ? (
        <p className="w-full text-center text-small text-ink-muted">{c.stage === "withdrawn" ? "This candidate withdrew their application." : `Candidate is ${STAGE_LABEL[c.stage].toLowerCase()}.`}</p>
      ) : (
        <>
          <Button variant="ghost" className="text-danger-fg hover:bg-danger-bg hover:text-danger-fg" onClick={() => onMove("rejected")}>Reject</Button>
          <Select aria-label="Move to stage" className="h-10 w-auto" value="" onChange={(e) => e.target.value && onMove(e.target.value as ApplicationStage)}>
            <option value="">Move to…</option>
            {PIPELINE_STAGES.filter((s) => s !== c.stage).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </Select>
          {nextStage && <Button onClick={() => onMove(nextStage)} loading={moving} icon={<ChevronRight className="h-4 w-4" />}>Move to {STAGE_LABEL[nextStage]}</Button>}
        </>
      )}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <a href={`tel:+91${w.phone}`} className={buttonClass("secondary")}><Phone className="h-4 w-4" aria-hidden /> +91 {w.phone}</a>
          <a href={`https://wa.me/91${w.phone}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}><MessageCircle className="h-4 w-4 text-green-600" aria-hidden /> WhatsApp</a>
          <Button variant="ghost" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
        </div>

        {c.stage === "interview" && c.interview && (
          <div className="rounded-lg bg-interview-bg p-4">
            <p className="flex items-center gap-2 text-body font-medium text-interview-fg"><CalendarClock className="h-4 w-4" aria-hidden /> Interview {formatDateTime(c.interview.at)}</p>
            <p className="mt-1 flex items-center gap-2 text-small text-ink-secondary"><MapPin className="h-4 w-4" aria-hidden /> {c.interview.place}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-interview-fg/15 pt-3">
              <ReplyBadge response={c.interview.response} />
              {c.interview.responseNote && <span className="text-small text-ink-secondary">"{c.interview.responseNote}"</span>}
              <Button size="sm" variant="secondary" className="ml-auto" onClick={() => onMove("interview")}>{c.interview.response === "cant_attend" ? "Pick a new time" : "Reschedule"}</Button>
            </div>
          </div>
        )}
        {c.stage === "offer" && (
          <div className={cn("rounded-lg p-4 text-body", c.offerResponse === "accepted" ? "bg-success-bg text-success-fg" : "bg-surface-muted text-ink-secondary")}>
            {c.offerResponse === "accepted" ? <span className="font-medium">✓ Accepted your offer. Mark as hired once they join.</span> : "Offer sent. Waiting for the worker to accept."}
          </div>
        )}
        {c.offerResponse === "declined" && <div className="rounded-lg bg-warning-bg p-4 text-body text-warning-fg">The worker declined your offer.</div>}

        <Tabs tabs={[{ value: "resume", label: "Resume & documents", count: c.documents.length }, { value: "profile", label: "Profile" }, { value: "activity", label: "Activity" }]} value={tab} onChange={setTab} />

        {tab === "resume" && (
          <div className="animate-page space-y-4">
            <p className="rounded-md bg-surface-muted px-3 py-2 text-small text-ink-secondary">
              {c.sentWith === "document" && sent ? <>Applied with <span className="font-medium text-ink">{sent.name}</span>.</> : <>Applied with their <span className="font-medium text-ink">IndustriaLink profile</span>. See the Profile tab.</>}
            </p>
            {c.documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-strong p-6 text-center">
                <p className="text-body font-medium text-ink">No documents uploaded</p>
                <p className="mt-1 text-small text-ink-muted">Many workers don't have a resume. Their profile has their trade, experience and skills.</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setTab("profile")}>View profile</Button>
              </div>
            ) : (
              <>
                <ul className="flex flex-wrap gap-2">
                  {[...resumes, ...others].map((d) => (
                    <li key={d.id}>
                      <button onClick={() => setDocId(d.id)} aria-pressed={d.id === docId}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-small font-medium transition-colors",
                          d.id === docId ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-secondary hover:border-border-strong")}>
                        {d.mimeType.startsWith("image/") ? <FileImage className="h-3.5 w-3.5" aria-hidden /> : <FileText className="h-3.5 w-3.5" aria-hidden />}
                        {DOC_TYPE_LABEL[d.type]}
                        {d.id === c.documentId && <Star className="h-3 w-3 fill-current" aria-label="Sent with application" />}
                      </button>
                    </li>
                  ))}
                </ul>
                {shownDoc ? <DocumentPreview doc={shownDoc} tall /> : <p className="text-small text-ink-muted">Choose a document above.</p>}
                <p className="text-caption text-ink-muted">{c.documents.length} file{c.documents.length === 1 ? "" : "s"} · {c.documents.map((d) => formatBytes(d.sizeBytes)).join(", ")}</p>
              </>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div className="animate-page space-y-5">
            <DefinitionList items={[
              ["Trade", w.trade ? TRADE_LABEL[w.trade] : ""],
              ["Experience", w.experience ? EXPERIENCE_LABEL[w.experience] : ""],
              ["Location", w.location ? `${w.location.city}, ${w.location.state}` : ""],
              ["Education", w.qualifications.join(", ")],
              ["Licences", w.licences.join(", ")],
              ["Expected pay", w.expectedPay ? `₹${formatNumber(w.expectedPay)} / month` : ""],
              ["Availability", AVAILABILITY_LABEL[w.availability]],
              ["Shift", w.shiftPreference ? SHIFT_LABEL[w.shiftPreference] : ""],
              ["Ready to move", w.willingToRelocate ? "Yes" : "No"],
              ["Looking for", w.employmentType ? EMPLOYMENT_TYPE_LABEL[w.employmentType] : ""],
              ["Languages", (w.languages ?? []).join(", ")],
              ["Safety training", w.safetyTrainingHours ? `${w.safetyTrainingHours} hours` : ""],
              ["Email", w.email ?? ""],
            ]} />
            {w.skills.length > 0 && (
              <div>
                <p className="text-caption text-ink-muted">Skills</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">{w.skills.map((s) => <li key={s} className="rounded-sm bg-surface-muted px-2 py-1 text-small">{s}</li>)}</ul>
              </div>
            )}
            {w.about && <div><p className="text-caption text-ink-muted">About</p><p className="mt-1 text-body text-ink">{w.about}</p></div>}
          </div>
        )}

        {tab === "activity" && (
          <ol className="animate-page space-y-3 border-l-2 border-border pl-4">
            {[...c.timeline].reverse().map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                <p className="text-body text-ink">{e.stage === "viewed" ? "Seen by you" : STAGE_LABEL[e.stage]}</p>
                <p className="text-small text-ink-muted">{formatDateTime(e.at)}{e.note ? ` · "${e.note}"` : ""}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------- Moving candidates (shared by board + list) ---------------- */

interface PendingMove { ids: string[]; stage: ApplicationStage }

/** Handles stage changes, including the extra dialogs for Interview and Reject. */
export function useCandidateMoves({ list, optimisticKey, defaultPlace, onDone, job }: {
  list: Candidate[]; optimisticKey?: QueryKey; defaultPlace?: string; onDone?: () => void;
  /** When given, HR is asked to close the job once every opening is filled. */
  job?: { id: string; title: string; openings: number; status: string };
}) {
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [fullPrompt, setFullPrompt] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();

  const move = useMutation({
    mutationFn: async ({ ids, stage, note, notify, interview }: PendingMove & { note?: string; notify?: boolean; interview?: { at: string; place: string } }) => {
      for (const cid of ids) await employerApi.moveCandidate(cid, { stage, note, notify, interview });
    },
    onMutate: async ({ ids, stage }) => {
      if (!optimisticKey) return {};
      await qc.cancelQueries({ queryKey: optimisticKey });
      const prev = qc.getQueryData<Candidate[]>(optimisticKey);
      qc.setQueryData<Candidate[]>(optimisticKey, (l) => l?.map((c) => (ids.includes(c.id) ? { ...c, stage } : c)));
      return { prev };
    },
    onError: (e, _v, ctx) => { if (optimisticKey) qc.setQueryData(optimisticKey, ctx?.prev); toast.error(errorMessage(e)); },
    onSuccess: (_d, { ids, stage }) => {
      setPending(null);
      onDone?.();
      toast.success(ids.length > 1 ? `${ids.length} candidates moved to ${STAGE_LABEL[stage]}` : `Moved to ${STAGE_LABEL[stage]}`);
      if (stage === "hired" && job && job.status === "active") {
        const hired = list.filter((c) => c.stage === "hired" || ids.includes(c.id)).length;
        if (hired >= job.openings) setFullPrompt(true);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.employer.all }),
  });

  const requestMove = (ids: string[], stage: ApplicationStage) => {
    const movable = ids.filter((cid) => list.find((c) => c.id === cid)?.stage !== "withdrawn");
    if (!movable.length) return toast.error("Withdrawn candidates can't be moved.");
    if (stage === "interview" || stage === "rejected") setPending({ ids: movable, stage });
    else move.mutate({ ids: movable, stage });
  };

  const closeJob = useMutation({
    mutationFn: () => employerApi.updateJob(job!.id, { status: "closed" }),
    onSuccess: () => { setFullPrompt(false); toast.success("Job closed. It no longer takes applications."); qc.invalidateQueries({ queryKey: qk.employer.all }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const dialogs = (
    <>
      <ConfirmDialog open={fullPrompt} onClose={() => setFullPrompt(false)} onConfirm={() => closeJob.mutate()} loading={closeJob.isPending} tone="primary"
        title="All positions are filled 🎉" confirmLabel="Close job"
        message={`You've hired ${job?.openings ?? ""} ${job?.openings === 1 ? "person" : "people"} for "${job?.title ?? ""}". Close the job so new people stop applying? Candidates still in progress stay on your board.`} />
      <InterviewDialog open={pending?.stage === "interview"} count={pending?.ids.length ?? 0} defaultPlace={defaultPlace ?? ""}
        onClose={() => setPending(null)} loading={move.isPending} onConfirm={(interview) => pending && move.mutate({ ...pending, interview })} />
      <RejectDialog open={pending?.stage === "rejected"} count={pending?.ids.length ?? 0} onClose={() => setPending(null)} loading={move.isPending}
        onConfirm={(note, notify) => pending && move.mutate({ ...pending, note, notify })} />
    </>
  );

  return { requestMove, dialogs, moving: move.isPending };
}

function InterviewDialog({ open, count, defaultPlace, onClose, onConfirm, loading }: { open: boolean; count: number; defaultPlace: string; onClose: () => void; onConfirm: (i: { at: string; place: string }) => void; loading: boolean }) {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("10:00");
  const [place, setPlace] = useState(defaultPlace);
  const [error, setError] = useState<string>();
  const submit = () => {
    const at = new Date(`${date}T${time}`);
    if (Number.isNaN(at.getTime()) || at < new Date()) return setError("Choose a time in the future.");
    if (!place.trim()) return setError("Add the interview place.");
    setError(undefined);
    onConfirm({ at: at.toISOString(), place: place.trim() });
  };
  return (
    <Modal open={open} onClose={onClose} title={count > 1 ? `Schedule interview for ${count} candidates` : "Schedule interview"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={loading}>Schedule & notify</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">{(id) => <Input id={id} type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label="Time">{(id) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
        </div>
        <Field label="Place" error={error}>{(id, d) => <Input id={id} aria-describedby={d} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Gate no., building, area" />}</Field>
        <p className="text-small text-ink-muted">The worker gets a notification with the date, time and place.</p>
      </div>
    </Modal>
  );
}

function RejectDialog({ open, count, onClose, onConfirm, loading }: { open: boolean; count: number; onClose: () => void; onConfirm: (note: string | undefined, notify: boolean) => void; loading: boolean }) {
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  return (
    <Modal open={open} onClose={onClose} title={count > 1 ? `Reject ${count} candidates?` : "Reject this candidate?"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => onConfirm(note.trim() || undefined, notify)} loading={loading}>Reject</Button></>}>
      <div className="space-y-4">
        <Field label="Reason (optional, only you see this)">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Needs more experience" />}</Field>
        <Checkbox label="Send a polite message to the candidate" checked={notify} onChange={setNotify} hint={'They\'ll see "Not selected this time".'} />
      </div>
    </Modal>
  );
}

export function QualificationBadges({ c }: { c: Candidate }) {
  const w = c.worker;
  return (
    <div className="flex flex-wrap gap-1">
      {w.qualifications.filter((q) => q === "ITI" || q === "Diploma").map((q) => <Badge key={q} tone="info" icon={<span aria-hidden>✓</span>}>{q}</Badge>)}
      {w.licences.slice(0, 2).map((l) => <Badge key={l} tone="success" icon={<span aria-hidden>✓</span>}>{l}</Badge>)}
      {c.documents.some((d) => d.type === "resume") && <Badge tone="neutral" icon={<FileText className="h-3 w-3" aria-hidden />}>Resume</Badge>}
      {c.stage === "withdrawn" && <Badge tone="neutral">Withdrawn</Badge>}
    </div>
  );
}
