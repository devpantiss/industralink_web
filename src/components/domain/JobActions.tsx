import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { workerApi } from "@/api/worker";
import { reportsApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import type { ReportReason } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

/* Apply and Report flows, shared by the job page, the dashboard detail panel and the job drawer. */

export function ApplyDrawer({ open, onClose, jobId, title }: { open: boolean; onClose: () => void; jobId: string; title: string }) {
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
      <Drawer open={open || !!doneId} onClose={close} title={t("Application sent")}>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success-fg"><CheckCircle2 className="h-9 w-9" aria-hidden /></span>
          <h3 className="mt-4 text-h2">{t("Applied!")}</h3>
          <p className="mt-1 max-w-xs text-body text-ink-secondary">{t("We'll tell you when the employer replies. You can track it in Applications.")}</p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button size="lg" onClick={() => navigate(`/worker/applications/${doneId}`)}>{t("Track application")}</Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/worker/jobs")}>{t("Find more jobs")}</Button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onClose={close} title={t("Apply")} subtitle={title}
      footer={<Button size="lg" className="w-full" onClick={() => apply.mutate()} loading={apply.isPending} loadingText={t("Sending…")}>{t("Send application")}</Button>}>
      <fieldset>
        <legend className="text-h3">{t("What should we send?")}</legend>
        <div className="mt-3 space-y-2">
          <Option checked={choice === "profile"} onChange={() => setChoice("profile")} title={t("My IndustriaLink profile")} text={t("Your trade, experience, skills and documents. Recommended.")} />
          {resumes.map((r) => (
            <Option key={r.id} checked={choice === r.id} onChange={() => setChoice(r.id)} title={r.name} text={r.isDefaultResume ? t("Your default resume") : t("Resume")} />
          ))}
        </div>
        {resumes.length === 0 && !docs.isLoading && (
          <p className="mt-3 text-small text-ink-muted">{t("No resume? No problem. Your profile works as your resume.")} <Link to="/worker/profile?tab=documents" className="text-primary hover:underline">{t("Upload one")}</Link></p>
        )}
      </fieldset>
      <div className="mt-6 rounded-lg bg-surface-muted p-4">
        <p className="text-caption text-ink-muted">{t("Employer will call you on")}</p>
        <p className="text-body font-medium text-ink">+91 {profile.data?.phone ?? "…"} <span className="text-success-fg">✓ {t("verified")}</span></p>
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

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "asks_money", label: "They asked me for money" },
  { value: "fake", label: "Job looks fake" },
  { value: "wrong_details", label: "Pay or details are wrong" },
  { value: "unsafe", label: "Unsafe work" },
  { value: "other", label: "Something else" },
];

export function ReportDialog({ open, onClose, jobId }: { open: boolean; onClose: () => void; jobId: string }) {
  const [reason, setReason] = useState<ReportReason>("asks_money");
  const [details, setDetails] = useState("");
  const toast = useToast();
  const send = useMutation({
    mutationFn: () => reportsApi.report(jobId, { reason, details: details.trim() || undefined }),
    onSuccess: () => { toast.success(t("Thanks. Our team will check this job within 24 hours.")); setDetails(""); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title={t("Report this job")}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="danger" loading={send.isPending} disabled={reason === "other" && !details.trim()} onClick={() => send.mutate()}>{t("Send report")}</Button>
      </>}>
      <p>{t("Our team checks every report. The company won't see your name.")}</p>
      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">What is wrong?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-body", reason === r.value ? "border-primary bg-primary-soft" : "border-border")}>
            <input type="radio" name="report-reason" checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[rgb(var(--primary))]" />
            {t(r.label)}
          </label>
        ))}
      </fieldset>
      <Field label={reason === "other" ? t("What happened? (required)") : t("What happened? (optional)")} className="mt-4">
        {(id) => <Textarea id={id} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={t("e.g. The caller asked ₹2,000 for a uniform.")} />}
      </Field>
    </Modal>
  );
}
