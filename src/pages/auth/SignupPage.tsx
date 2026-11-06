import { useState, type FormEvent } from "react";
import { t } from "@/lib/i18n";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { errorCode, errorMessage } from "@/api/client";
import type { AuthResponse } from "@/types";
import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthLayout } from "./AuthLayout";
import { OtpForm } from "./OtpForm";
import { lastAudience, RolePicker, type Audience } from "./RolePicker";

export default function SignupPage() {
  const [sp] = useSearchParams();
  const [as, setAs] = useState<Audience>((sp.get("as") as Audience) || lastAudience());
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const done = (res: AuthResponse) => {
    signIn(res);
    navigate(`/${res.user.role}/welcome`, { replace: true });
  };

  return (
    <AuthLayout side={as} title={t("Create your free account")} subtitle={t("Takes less than a minute.")}>
      <RolePicker value={as} onChange={setAs} />
      <div key={as} className="animate-page mt-6">
        {as === "worker"
          ? <WorkerSignup onSuccess={done} initialPhone={sp.get("phone") ?? ""} onExisting={(phone) => navigate(`/login?as=worker&phone=${phone}`)} />
          : <EmployerSignup onSuccess={done} />}
        <p className="mt-8 text-center text-body text-ink-secondary">
          Already have an account? <Link to={`/login?as=${as}`} className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function WorkerSignup({ onSuccess, initialPhone, onExisting }: { onSuccess: (r: AuthResponse) => void; initialPhone: string; onExisting: (phone: string) => void }) {
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  if (!confirmed) {
    return (
      <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return setError("Please enter your name."); setConfirmed(true); }}>
        <Field label={t("Your full name")} error={error} hint={t("As on your Aadhaar, so employers can trust it.")}>
          {(id, d) => <Input id={id} aria-describedby={d} inputSize="lg" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus invalid={!!error} />}
        </Field>
        <Button type="submit" size="lg">{t("Continue")}</Button>
      </form>
    );
  }
  return (
    <div className="animate-page">
      <p className="mb-4 text-body text-ink-secondary">
        Hi <span className="font-medium text-ink">{name}</span>, now verify your mobile number.{" "}
        <button className="font-medium text-primary hover:underline" onClick={() => setConfirmed(false)}>Edit name</button>
      </p>
      <OtpForm mode="signup" name={name.trim()} initialPhone={initialPhone} onSuccess={onSuccess} onWrongMode={onExisting} submitLabel="Create account" />
    </div>
  );
}

function EmployerSignup({ onSuccess }: { onSuccess: (r: AuthResponse) => void }) {
  const [f, setF] = useState({ name: "", companyName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof f | "form", string>>>({});
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!f.name.trim()) errs.name = "Enter your name.";
    if (!f.companyName.trim()) errs.companyName = "Enter your company name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = "Enter a valid work email.";
    if (f.password.length < 8) errs.password = "Use at least 8 characters.";
    setErrors(errs);
    setExists(false);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      onSuccess(await authApi.signupEmployer(f));
    } catch (err) {
      setExists(errorCode(err) === "EXISTS");
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={errors.name}>{(id) => <Input id={id} autoComplete="name" value={f.name} onChange={set("name")} invalid={!!errors.name} autoFocus />}</Field>
        <Field label="Company name" error={errors.companyName}>{(id) => <Input id={id} autoComplete="organization" value={f.companyName} onChange={set("companyName")} invalid={!!errors.companyName} />}</Field>
      </div>
      <Field label="Work email" error={errors.email}>{(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={set("email")} invalid={!!errors.email} />}</Field>
      <Field label="Password" error={errors.password} hint="At least 8 characters">{(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} invalid={!!errors.password} />}</Field>
      {errors.form && (
        <p role="alert" className="text-small text-danger-fg">
          {errors.form} {exists && <Link to="/login?as=employer" className="font-semibold text-primary hover:underline">Log in →</Link>}
        </p>
      )}
      <Button type="submit" size="lg" loading={busy} loadingText="Creating account…">Register company</Button>
      <p className="text-center text-caption text-ink-muted">We check every company before its jobs go live. This keeps workers safe from fake jobs.</p>
    </form>
  );
}
