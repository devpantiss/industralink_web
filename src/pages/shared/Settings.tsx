import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Eye, KeyRound, Languages, LifeBuoy, Monitor, Moon, Palette, ShieldAlert, SlidersHorizontal, Smartphone, Sun, Trash2 } from "lucide-react";
import { setThemeChoice, useThemeChoice, type ThemeChoice } from "@/lib/theme";
import type { PlatformSettings, UserSettings } from "@/types";
import { accountApi, passwordApi, platformApi } from "@/api/extra";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { useAuth, useUser } from "@/app/AuthContext";
import { LANGS, t, useLang } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

/** One settings page for every role; each role only sees the parts that apply. */
export default function Settings() {
  const user = useUser();
  const q = useQuery({ queryKey: qk.settings, queryFn: accountApi.settings });
  const qc = useQueryClient();
  const toast = useToast();
  const { lang, setLang } = useLang();
  const save = useMutation({
    mutationFn: (c: Partial<UserSettings>) => accountApi.updateSettings(c),
    onSuccess: (d) => { qc.setQueryData(qk.settings, d); toast.success(t("Settings saved")); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const worker = user.role === "worker";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("Settings")} description={worker ? t("Language, alerts and your account.") : "Alerts, password and your account."} />
      {q.isLoading || !q.data ? <ListSkeleton count={2} /> : (
        <>
          {worker && (
            <Section icon={<Languages className="h-5 w-5" />} title={t("Language")} description={lang === "en" ? "Choose your language" : `${t("Choose your language")} / Choose your language`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LANGS.map((l) => (
                  <button key={l.code} onClick={async () => { await setLang(l.code); accountApi.updateSettings({ language: l.code }).catch(() => undefined); }} aria-pressed={lang === l.code}
                    className={cn("rounded-lg border px-4 py-3 text-left transition-colors", lang === l.code ? "border-primary bg-primary-soft" : "border-border hover:border-border-strong")}>
                    <span className={cn("block text-body-lg font-semibold", lang === l.code ? "text-primary" : "text-ink")}>{l.native}</span>
                    {l.code !== "en" && <span className="block text-caption text-ink-muted">{l.english}</span>}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {user.role !== "admin" && (
            <Section icon={<Bell className="h-5 w-5" />} title={t("Alerts")} description={worker ? t("How we tell you about new jobs and replies.") : "How we tell you about new applicants and replies."}>
              <div className="divide-y divide-border">
                <Toggle label={worker ? t("New jobs that match me") : "New applicants on my jobs"} checked={q.data.jobAlerts} onChange={(v) => save.mutate({ jobAlerts: v })} />
                <Toggle label={t("SMS")} hint={worker ? t("Interview and offer updates by SMS.") : undefined} checked={q.data.smsAlerts} onChange={(v) => save.mutate({ smsAlerts: v })} />
                <Toggle label="WhatsApp" hint={worker ? t("Job alerts and updates on WhatsApp.") : undefined} checked={q.data.whatsappAlerts} onChange={(v) => save.mutate({ whatsappAlerts: v })} />
              </div>
            </Section>
          )}

          {worker && (
            <Section icon={<Eye className="h-5 w-5" />} title={t("Privacy")}>
              <Toggle label={t("Let companies find my profile")}
                hint={t("Verified companies can see your trade, experience and city, and invite you to apply. Your phone number stays hidden until you apply.")}
                checked={q.data.visibleToEmployers} onChange={(v) => save.mutate({ visibleToEmployers: v })} />
            </Section>
          )}

          <AppearanceSection />
          {user.role === "admin" && <PlatformSection />}
          {worker && <PhoneSection />}
          <PasswordSection />

          <Section icon={<LifeBuoy className="h-5 w-5" />} title={t("Help & support")}>
            <p className="text-body text-ink-secondary">{t("Questions, a new mobile number, or a problem with a job?")} <Link to="/help" className="font-medium text-primary hover:underline">{t("Open Help")}</Link></p>
          </Section>

          {user.role !== "admin" && <DeleteSection />}
        </>
      )}
    </div>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><span className="text-ink-muted">{icon}</span>{title}</span>} description={description} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0">
        <span className="block text-body font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-small text-ink-secondary">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-border-strong")}>
        <span className={cn("absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

/** Light, dark, or follow the device. Saved on this device only. */
function AppearanceSection() {
  const choice = useThemeChoice();
  const options: { key: ThemeChoice; label: string; icon: ReactNode }[] = [
    { key: "light", label: t("Light"), icon: <Sun className="h-5 w-5" aria-hidden /> },
    { key: "dark", label: t("Dark"), icon: <Moon className="h-5 w-5" aria-hidden /> },
    { key: "system", label: t("Same as my phone"), icon: <Monitor className="h-5 w-5" aria-hidden /> },
  ];
  return (
    <Section icon={<Palette className="h-5 w-5" />} title={t("Appearance")} description={t("Dark mode is easier on the eyes at night.")}>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("Appearance")}>
        {options.map((o) => (
          <button key={o.key} type="button" role="radio" aria-checked={choice === o.key} onClick={() => setThemeChoice(o.key)}
            className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-body-lg font-semibold transition-colors",
              choice === o.key ? "border-primary bg-primary-soft text-primary" : "border-border text-ink hover:border-border-strong")}>
            {o.icon}{o.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

/** Change the password, or set a first one on an account made with Google (then both work). */
function PasswordSection() {
  const user = useUser();
  const { setUser } = useAuth();
  const hasPassword = user.hasPassword !== false;
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string>();
  const toast = useToast();
  const change = useMutation({
    mutationFn: () => passwordApi.change(hasPassword ? cur : undefined, next),
    onSuccess: () => {
      toast.success(hasPassword ? t("Password changed. Other devices are logged out.") : t("Password set."));
      setCur(""); setNext("");
      setUser({ ...user, hasPassword: true });
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (next.length < 8) return setError(t("Use at least 8 characters for your password."));
    change.mutate();
  };
  return (
    <Section icon={<KeyRound className="h-5 w-5" />} title={hasPassword ? t("Password") : t("Set a password")}
      description={hasPassword ? undefined : t("You sign in with Google. Add a password to also log in with your email.")}>
      <form onSubmit={submit} className={cn("grid gap-3 sm:items-end", hasPassword ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]")} noValidate>
        {hasPassword && <Field label={t("Current password")}>{(id) => <Input id={id} type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />}</Field>}
        <Field label={t("New password (8+ characters)")} error={error}>{(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} invalid={!!error} />}</Field>
        <Button type="submit" variant="secondary" loading={change.isPending} disabled={(hasPassword && !cur) || !next}>{hasPassword ? t("Change") : t("Set password")}</Button>
      </form>
      {hasPassword && <p className="mt-2 text-small text-ink-muted">{t("Forgot it?")} <Link to="/forgot-password" className="font-medium text-primary hover:underline">{t("Reset by email")}</Link></p>}
    </Section>
  );
}

/** Worker's mobile number: companies call it after shortlisting. */
function PhoneSection() {
  const user = useUser();
  const { setUser } = useAuth();
  const [phone, setPhone] = useState(user.phone ?? "");
  const [error, setError] = useState<string>();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () => accountApi.savePhone(phone),
    onSuccess: (saved) => { setUser(saved); toast.success(t("Mobile number saved.")); },
    onError: (e) => setError(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!/^[6-9]\d{9}$/.test(phone)) return setError(t("Enter a 10-digit mobile number that starts with 6, 7, 8 or 9."));
    save.mutate();
  };
  return (
    <Section icon={<Smartphone className="h-5 w-5" />} title={t("Mobile number")} description={t("Companies call this number when they shortlist you.")}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
        <Field label={t("Mobile number")} error={error}>
          {(id, d) => <Input id={id} aria-describedby={d} prefix="+91" inputMode="numeric" autoComplete="tel-national" maxLength={10}
            value={phone} invalid={!!error} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />}
        </Field>
        <Button type="submit" variant="secondary" loading={save.isPending} disabled={phone === (user.phone ?? "")}>{t("Save number")}</Button>
      </form>
    </Section>
  );
}

function PlatformSection() {
  const q = useQuery({ queryKey: qk.admin.settings, queryFn: platformApi.get });
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (c: Partial<PlatformSettings>) => platformApi.update(c),
    onSuccess: (d) => { qc.setQueryData(qk.admin.settings, d); toast.success("Platform setting saved. It's in the activity log."); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const p = q.data;
  return (
    <Section icon={<SlidersHorizontal className="h-5 w-5" />} title="Platform" description="Affects every user. Each change is recorded in the activity log.">
      {!p ? <ListSkeleton count={1} /> : (
        <div className="divide-y divide-border">
          <Toggle label="Workers and HR can message each other" hint="Only after a worker is shortlisted. Turn off if it is misused." checked={p.messagingEnabled} onChange={(v) => save.mutate({ messagingEnabled: v })} />
          <Toggle label="Employers can search workers (Find workers)" hint="Only workers who allow it appear. Phone numbers stay hidden." checked={p.talentSearchEnabled} onChange={(v) => save.mutate({ talentSearchEnabled: v })} />
          <Toggle label="Approve new companies automatically" hint="Not recommended: fake companies could post jobs straight away." checked={p.autoApproveCompanies} onChange={(v) => save.mutate({ autoApproveCompanies: v })} />
        </div>
      )}
    </Section>
  );
}

function DeleteSection() {
  const user = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const del = useMutation({
    mutationFn: accountApi.deleteAccount,
    onSuccess: () => { setOpen(false); signOut(); toast.success(t("Your account was deleted")); navigate("/login", { replace: true }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const worker = user.role === "worker";
  return (
    <Card className="border-danger-fg/25">
      <CardHeader title={<span className="flex items-center gap-2 text-danger-fg"><Trash2 className="h-5 w-5" />{t("Delete account")}</span>} />
      <CardBody>
        <p className="text-body text-ink-secondary">
          {worker
            ? t("Your profile, resume and documents are deleted straight away. Open applications are withdrawn. This can't be undone.")
            : "Your company's open jobs close and the company page is hidden. This can't be undone."}
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>{t("Delete my account")}</Button>
      </CardBody>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Delete your account?")}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button variant="danger" disabled={typed !== "DELETE"} loading={del.isPending} onClick={() => del.mutate()}>{t("Delete for ever")}</Button></>}>
        <p className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg" aria-hidden />{t("This removes your account for ever. To confirm, type DELETE below.")}</p>
        <Input className="mt-4" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="DELETE" aria-label="Type DELETE to confirm" />
      </Modal>
    </Card>
  );
}
