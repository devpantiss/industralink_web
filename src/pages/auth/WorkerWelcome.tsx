import { useState } from "react";
import { t } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { takeNext } from "@/lib/next";
import { useQueryClient } from "@tanstack/react-query";
import { Bolt, Car, Cog, Construction, HardHat, Hammer, Shield, UserCog, Wrench, Flame, type LucideIcon } from "lucide-react";
import type { ExperienceBand, Trade, WorkerProfile } from "@/types";
import { EXPERIENCE_LABEL, LICENCES, QUALIFICATIONS, TRADE_LABEL } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { workerApi } from "@/api/worker";
import { authApi } from "@/api/auth";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Input } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const TRADE_ICON: Record<Trade, LucideIcon> = {
  welder: Flame, electrician: Bolt, fitter: Wrench, machine_operator: Cog, driver: Car,
  crane_operator: Construction, helper: HardHat, security: Shield, supervisor: UserCog, other: Hammer,
};

/** Tap-based onboarding, almost no typing (plan section 7). Every step can be skipped. */
export default function WorkerWelcome() {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Partial<WorkerProfile>>({ qualifications: [], licences: [], willingToRelocate: true, expectedPay: 18000 });
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const toggle = (key: "qualifications" | "licences", v: string) =>
    setP((s) => ({ ...s, [key]: s[key]!.includes(v) ? s[key]!.filter((x) => x !== v) : [...s[key]!, v] }));

  const finish = async () => {
    setBusy(true);
    try {
      await workerApi.updateProfile(p);
      setUser(await authApi.completeOnboarding());
      qc.invalidateQueries();
      toast.success(t("Profile ready! Here are jobs for you."));
      navigate(takeNext("worker") ?? "/worker", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const next = () => (step < 2 ? setStep(step + 1) : finish());

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper steps={[t("Your work"), t("Experience"), t("Place & pay")]} current={step} />
      <div className="mt-8">
        {step === 0 && (
          <section>
            <h1 className="text-h1">{t("What work do you do?")}</h1>
            <p className="mt-1 text-body-lg text-ink-secondary">{t("Tap one.")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(TRADE_LABEL) as Trade[]).map((tr) => {
                const Icon = TRADE_ICON[tr];
                const on = p.trade === tr;
                return (
                  <button key={tr} type="button" aria-pressed={on} onClick={() => setP({ ...p, trade: tr })}
                    className={cn("flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-lg border p-4 text-body-lg font-medium transition-colors",
                      on ? "border-primary bg-primary-soft text-primary ring-1 ring-primary" : "border-border bg-surface text-ink hover:border-border-strong")}>
                    <Icon className="h-7 w-7" aria-hidden /> {t(TRADE_LABEL[tr])}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-8">
            <div>
              <h1 className="text-h1">{t("How much experience?")}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(EXPERIENCE_LABEL) as ExperienceBand[]).map((x) => (
                  <Chip key={x} selected={p.experience === x} onClick={() => setP({ ...p, experience: x })} className="h-11 px-5 text-body">{t(EXPERIENCE_LABEL[x])}</Chip>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-h2">{t("Education & training")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUALIFICATIONS.map((q) => <Chip key={q} selected={p.qualifications!.includes(q)} onClick={() => toggle("qualifications", q)} className="h-11 px-5 text-body">{q}</Chip>)}
              </div>
            </div>
            <div>
              <h2 className="text-h2">{t("Licences / certificates")} <span className="font-normal text-ink-muted">({t("if any")})</span></h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {LICENCES.map((q) => <Chip key={q} selected={p.licences!.includes(q)} onClick={() => toggle("licences", q)} className="h-11 px-5 text-body">{q}</Chip>)}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h1 className="text-h1">{t("Where do you want to work?")}</h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("City")}>{(id) => <Input id={id} inputSize="lg" placeholder="e.g. Jharsuguda" value={p.location?.city ?? ""} onChange={(e) => setP({ ...p, location: { city: e.target.value, state: p.location?.state ?? "" } })} />}</Field>
              <Field label={t("State")}>{(id) => <Input id={id} inputSize="lg" placeholder="e.g. Odisha" value={p.location?.state ?? ""} onChange={(e) => setP({ ...p, location: { city: p.location?.city ?? "", state: e.target.value } })} />}</Field>
            </div>
            <div>
              <p className="text-small font-medium text-ink">{t("Ready to move to another city?")}</p>
              <div className="mt-2 flex gap-2">
                <Chip selected={p.willingToRelocate === true} onClick={() => setP({ ...p, willingToRelocate: true })} className="h-11 px-6 text-body">Yes</Chip>
                <Chip selected={p.willingToRelocate === false} onClick={() => setP({ ...p, willingToRelocate: false })} className="h-11 px-6 text-body">No</Chip>
              </div>
            </div>
            <div>
              <label htmlFor="pay" className="text-small font-medium text-ink">{t("Expected pay per month")}</label>
              <p className="mt-1 text-h1 tabular text-ink">₹{formatNumber(p.expectedPay ?? 0)}</p>
              <input id="pay" type="range" min={8000} max={60000} step={1000} value={p.expectedPay} onChange={(e) => setP({ ...p, expectedPay: Number(e.target.value) })} className="mt-2 w-full accent-[rgb(var(--primary))]" />
              <div className="flex justify-between text-caption text-ink-muted"><span>₹8,000</span><span>₹60,000</span></div>
            </div>
          </section>
        )}
      </div>

      <div className="glass sticky bottom-4 mt-10 flex items-center justify-between gap-3 rounded-2xl border p-3">
        {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>{t("Back")}</Button> : <Button variant="ghost" onClick={finish} disabled={busy}>{t("Skip for now")}</Button>}
        <Button size="lg" onClick={next} loading={busy} disabled={step === 0 && !p.trade}>{step < 2 ? t("Continue") : t("Show me jobs")}</Button>
      </div>
    </div>
  );
}
