import { useState, type FormEvent } from "react";
import { t } from "@/lib/i18n";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { errorCode, errorMessage } from "@/api/client";
import type { AuthResponse } from "@/types";
import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { GoogleSection } from "@/components/auth/GoogleAuth";
import { useFinishLogin } from "./LoginPage";
import { AuthLayout } from "./AuthLayout";
import { audienceFromUrl, RolePicker, type Audience } from "./RolePicker";
import { getHandoff } from "@/lib/handoff";

export default function SignupPage() {
  const [sp] = useSearchParams();
  const handoff = getHandoff(); // details typed on the landing site
  const [as, setAs] = useState<Audience>(() => audienceFromUrl(sp, handoff.draft || handoff.company ? "employer" : undefined));
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const done = (res: AuthResponse) => {
    signIn(res);
    navigate(`/${res.user.role}/welcome`, { replace: true });
  };
  // Google may log in an account that already exists: new ones go to the welcome steps.
  const finishLogin = useFinishLogin();
  const googleDone = (res: AuthResponse) => (res.user.onboarded ? finishLogin(res) : done(res));

  return (
    <AuthLayout side={as} title={t("Create your free account")} subtitle={t("Takes less than a minute.")}>
      <RolePicker value={as} onChange={setAs} />
      <div key={as} className="animate-page mt-6">
        <SignupForm role={as} onSuccess={done} onGoogle={googleDone}
          initial={{ name: handoff.name, phone: sp.get("phone") ?? handoff.phone, companyName: handoff.company, email: handoff.email }} />
        <p className="mt-8 text-center text-body text-ink-secondary">
          {t("Already have an account?")} <Link to={`/login?as=${as}`} className="font-semibold text-primary hover:underline">{t("Log in")}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

type Form = { name: string; phone: string; companyName: string; email: string; password: string };

/**
 * One form for both tabs, four fields each, so switching never changes the height:
 * workers give a mobile number (for companies to call), HR the company name.
 */
function SignupForm({ role, onSuccess, onGoogle, initial = {} }: {
  role: Audience;
  onSuccess: (r: AuthResponse) => void;
  onGoogle: (r: AuthResponse) => void;
  initial?: Partial<Form>;
}) {
  const worker = role === "worker";
  const [f, setF] = useState<Form>({
    name: initial.name ?? "", phone: initial.phone ?? "", companyName: initial.companyName ?? "", email: initial.email ?? "", password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "form", string>>>({});
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: k === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (f.name.trim().length < 2) errs.name = t("Please enter your full name.");
    if (worker && !/^[6-9]\d{9}$/.test(f.phone)) errs.phone = t("Enter a 10-digit mobile number that starts with 6, 7, 8 or 9.");
    if (!worker && f.companyName.trim().length < 2) errs.companyName = "Enter your company name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) errs.email = t("Enter a valid email address.");
    if (f.password.length < 8) errs.password = t("Use at least 8 characters for your password.");
    setErrors(errs);
    setExists(false);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const account = { name: f.name.trim(), email: f.email.trim(), password: f.password };
      onSuccess(worker
        ? await authApi.signupWorker({ ...account, phone: f.phone })
        : await authApi.signupEmployer({ ...account, companyName: f.companyName.trim() }));
    } catch (err) {
      setExists(errorCode(err) === "EXISTS");
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GoogleSection mode="signup" role={role} companyName={f.companyName} onSuccess={onGoogle} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={worker ? t("Your full name") : "Your name"} error={errors.name}>
            {(id) => <Input id={id} autoComplete="name" value={f.name} onChange={set("name")} invalid={!!errors.name} autoFocus />}
          </Field>
          {worker ? (
            <Field label={t("Mobile number")} error={errors.phone}>
              {(id) => <Input id={id} prefix="+91" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="98765 43210"
                value={f.phone} onChange={set("phone")} invalid={!!errors.phone} />}
            </Field>
          ) : (
            <Field label="Company name" error={errors.companyName}>
              {(id) => <Input id={id} autoComplete="organization" value={f.companyName} onChange={set("companyName")} invalid={!!errors.companyName} />}
            </Field>
          )}
        </div>
        <Field label={worker ? t("Email") : "Work email"} error={errors.email}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={set("email")} invalid={!!errors.email} />}
        </Field>
        <Field label={t("Password")} error={errors.password} hint={t("At least 8 characters")}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} invalid={!!errors.password} />}
        </Field>
        {errors.form && (
          <p role="alert" className="text-small text-danger-fg">
            {errors.form} {exists && <Link to={`/login?as=${role}`} className="font-semibold text-primary hover:underline">{t("Log in")} →</Link>}
          </p>
        )}
        <Button type="submit" size="lg" loading={busy} loadingText={t("Creating account…")}>
          {worker ? t("Create account") : "Register company"}
        </Button>
        <p className="text-center text-caption text-ink-muted">
          {worker ? t("Free for workers, always. We never ask workers for money.") : "We check every company before its jobs go live."}
        </p>
      </form>
    </>
  );
}
