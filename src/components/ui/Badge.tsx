import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { BadgeCheck, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AccountStatus, ApplicationStage, JobStatus, VerificationStatus } from "@/types";
import { STAGE_LABEL, STAGE_LABEL_WORKER } from "@/lib/labels";

export type Tone = "neutral" | "info" | "interview" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-bg text-neutral-fg",
  info: "bg-info-bg text-info-fg",
  interview: "bg-interview-bg text-interview-fg",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
};

/** Status is never shown by colour alone: always a word, plus a dot or icon. */
export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-caption font-medium", tones[tone], className)}>
      {icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const STAGE_TONE: Record<ApplicationStage, Tone> = {
  applied: "neutral", shortlisted: "info", interview: "interview", offer: "success", hired: "success", rejected: "danger", withdrawn: "neutral",
};

export function StageBadge({ stage, audience = "employer" }: { stage: ApplicationStage; audience?: "worker" | "employer" }) {
  const label = audience === "worker" ? t(STAGE_LABEL_WORKER[stage]) : STAGE_LABEL[stage];
  const tone = audience === "worker" && stage === "rejected" ? "neutral" : STAGE_TONE[stage];
  const icon = stage === "hired" ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : stage === "rejected" && audience === "employer" ? <XCircle className="h-3 w-3" aria-hidden /> : undefined;
  return <Badge tone={tone} icon={icon}>{label}</Badge>;
}

export function VerificationBadge({ status, compact }: { status: VerificationStatus; compact?: boolean }) {
  if (status === "approved") return <Badge tone="success" icon={<BadgeCheck className="h-3 w-3" aria-hidden />}>Verified</Badge>;
  if (status === "rejected") return <Badge tone="danger" icon={<XCircle className="h-3 w-3" aria-hidden />}>{compact ? "Rejected" : "Not approved"}</Badge>;
  return <Badge tone="warning" icon={<Clock className="h-3 w-3" aria-hidden />}>{compact ? "Pending" : "Under review"}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  if (status === "active") return <Badge tone="success">Active</Badge>;
  if (status === "draft") return <Badge tone="neutral">Draft</Badge>;
  return <Badge tone="neutral" icon={<XCircle className="h-3 w-3" aria-hidden />}>Closed</Badge>;
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  if (status === "active") return <Badge tone="success">Active</Badge>;
  if (status === "blocked") return <Badge tone="danger" icon={<XCircle className="h-3 w-3" aria-hidden />}>Blocked</Badge>;
  return <Badge tone="warning" icon={<Clock className="h-3 w-3" aria-hidden />}>Pending</Badge>;
}

export function VerifiedTick({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-0.5 text-caption font-medium text-success-fg">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {t("Verified")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-caption font-medium text-warning-fg">
      <Clock className="h-3.5 w-3.5" aria-hidden /> {t("Not yet verified")}
    </span>
  );
}
