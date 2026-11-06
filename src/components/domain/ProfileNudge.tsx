import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileUp, Sparkles } from "lucide-react";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { ProgressBar } from "@/components/ui/Misc";

/**
 * Shown on every worker page until the profile is complete and a resume is
 * uploaded. Deliberately not dismissible: it is the most important next step.
 */
export function ProfileNudge() {
  const { pathname } = useLocation();
  const q = useQuery({ queryKey: qk.worker.summary, queryFn: workerApi.summary });
  const s = q.data;
  if (!s || s.missing.length === 0) return null;
  const needsResume = s.missing.some((m) => m.key === "resume");
  const first = s.missing[0]!;
  const onProfile = pathname.startsWith("/worker/profile");

  return (
    <div className="animate-page border-b border-warning-fg/15 bg-warning-bg">
      <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on">
            {needsResume ? <FileUp className="h-5 w-5" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">
              {needsResume ? "Upload your resume to get noticed by employers" : `Your profile is ${s.profileStrength}% complete`}
            </p>
            <p className="truncate text-small text-ink-secondary">
              {s.missing.length === 1 ? first.label : `${s.missing.length} things left: ${s.missing.slice(0, 3).map((m) => m.label.replace(/^(Add|Upload) (your )?/i, "")).join(", ")}${s.missing.length > 3 ? "…" : ""}`}
            </p>
            <div className="mt-1.5 max-w-xs"><ProgressBar value={s.profileStrength} label="Profile complete" /></div>
          </div>
        </div>
        <Link to={first.link} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-body font-semibold text-white transition-transform hover:bg-ink/90 active:scale-[0.98]">
          {onProfile ? first.label : needsResume ? "Upload resume" : "Complete profile"} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
