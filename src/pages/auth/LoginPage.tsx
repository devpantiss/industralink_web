import { useState, type FormEvent, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Building2, HardHat, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { errorMessage } from "@/api/client";
import type { AuthResponse } from "@/types";
import { homeFor, useAuth } from "@/app/AuthContext";
import { takeNext } from "@/lib/next";
import { landingFor } from "@/app/guards";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthLayout } from "./AuthLayout";
import { OtpForm } from "./OtpForm";
import { audienceFromUrl, RolePicker, type Audience } from "./RolePicker";

export function useFinishLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  return (res: AuthResponse) => {
    signIn(res);
    const home = homeFor(res.user.role);
    const saved = takeNext(res.user.role);
    navigate(from?.startsWith(home) ? from : saved ?? landingFor(res.user.role), { replace: true });
  };
}

export default function LoginPage() {
  const [sp] = useSearchParams();
  const [as, setAs] = useState<Audience>(() => audienceFromUrl(sp));
  const done = useFinishLogin();
  const navigate = useNavigate();

  return (
    <AuthLayout side={as} title={t("Welcome back")} subtitle={t("Log in to continue.")}>
      <RolePicker value={as} onChange={setAs} />
      <div key={as} className="animate-page mt-6">
        {as === "worker" ? (
          <OtpForm mode="login" initialPhone={sp.get("phone") ?? ""} onSuccess={done} submitLabel="Log in"
            onWrongMode={(phone) => navigate(`/signup?as=worker&phone=${phone}`)} />
        ) : (
          <EmailLogin onSuccess={done} />
        )}
        <p className="mt-8 text-center text-body text-ink-secondary">
          {as === "worker" ? t("New here?") : "New company?"}{" "}
          <Link to={`/signup?as=${as}`} className="font-semibold text-primary hover:underline">
            {as === "worker" ? t("Create a free job seeker account") : "Register your company"}
          </Link>
        </p>
      </div>
      {SHOW_DEMO_LOGIN && <DemoLogin onSuccess={done} />}
    </AuthLayout>
  );
}

export function EmailLogin({ onSuccess, footer }: { onSuccess: (r: AuthResponse) => void; footer?: ReactNode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      onSuccess(await authApi.login(email, password));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Work email">{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} autoFocus />}</Field>
      <Field label="Password" error={error}>
        {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} />}
      </Field>
      <Link to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="-mt-2 self-end text-small font-medium text-primary hover:underline">Forgot password?</Link>
      <Button type="submit" size="lg" loading={busy} loadingText="Logging in…">Log in</Button>
      {footer}
    </form>
  );
}

/** One-click logins with the backend's test login. Only in local development, never in a production build. */
const SHOW_DEMO_LOGIN = import.meta.env.DEV;

const DEMO_USERS = [
  { key: "worker", label: "Worker", who: "Ramesh Kumar · Welder", icon: HardHat, login: () => authApi.devLogin({ phone: "9876543210" }) },
  { key: "employer", label: "HR / Employer", who: "Konark Heavy Engineering", icon: Building2, login: () => authApi.devLogin({ email: "hr@konark.demo" }) },
  { key: "admin", label: "Admin", who: "IndustriaLink team", icon: ShieldCheck, login: () => authApi.devLogin({ email: "admin@industrialink.demo" }) },
] as const;

function DemoLogin({ onSuccess }: { onSuccess: (r: AuthResponse) => void }) {
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const go = async (u: (typeof DEMO_USERS)[number]) => {
    setBusy(u.key); setError(undefined);
    try { onSuccess(await u.login()); } catch (e) { setError(errorMessage(e)); } finally { setBusy(undefined); }
  };
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border-strong bg-surface-muted/60 p-4">
      <p className="text-small font-semibold text-ink">Quick demo login</p>
      <p className="text-caption text-ink-muted">Uses the backend test login (DEV_LOGIN=true). Not shown in production.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {DEMO_USERS.map((u) => (
          <Button key={u.key} variant="secondary" size="sm" className="h-auto flex-col gap-0.5 py-2" onClick={() => go(u)}
            loading={busy === u.key} disabled={!!busy && busy !== u.key} icon={<u.icon className="h-4 w-4" aria-hidden />}>
            <span className="font-semibold">{u.label}</span>
            <span className="text-caption font-normal text-ink-muted">{u.who}</span>
          </Button>
        ))}
      </div>
      {error && <p className="mt-2 text-small text-danger-fg" role="alert">{error}</p>}
    </div>
  );
}
