import { useState, type FormEvent, type ReactNode } from "react";
import { Building2, HardHat, ShieldCheck } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { errorMessage, USE_MOCKS } from "@/api/client";
import type { AuthResponse } from "@/types";
import { homeFor, useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthLayout } from "./AuthLayout";
import { OtpForm } from "./OtpForm";
import { lastAudience, RolePicker, type Audience } from "./RolePicker";

export function useFinishLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  return (res: AuthResponse) => {
    signIn(res);
    const home = homeFor(res.user.role);
    navigate(from?.startsWith(home) ? from : home, { replace: true });
  };
}

export default function LoginPage() {
  const [sp] = useSearchParams();
  const [as, setAs] = useState<Audience>((sp.get("as") as Audience) || lastAudience());
  const done = useFinishLogin();
  const navigate = useNavigate();

  return (
    <AuthLayout side={as} title="Welcome back" subtitle="Log in to continue.">
      <RolePicker value={as} onChange={setAs} />
      <div key={as} className="animate-page mt-6">
        {as === "worker" ? (
          <OtpForm mode="login" initialPhone={sp.get("phone") ?? ""} onSuccess={done} submitLabel="Log in"
            onWrongMode={(phone) => navigate(`/signup?as=worker&phone=${phone}`)} />
        ) : (
          <EmailLogin onSuccess={done} />
        )}
        <p className="mt-8 text-center text-body text-ink-secondary">
          {as === "worker" ? "New here?" : "New company?"}{" "}
          <Link to={`/signup?as=${as}`} className="font-semibold text-primary hover:underline">
            {as === "worker" ? "Create a free job seeker account" : "Register your company"}
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
      <Button type="submit" size="lg" loading={busy} loadingText="Logging in…">Log in</Button>
      {footer}
    </form>
  );
}

/** One-click demo logins. Shown with mock data or in local dev; hidden in production builds. */
const SHOW_DEMO_LOGIN = USE_MOCKS || import.meta.env.DEV;

const DEMO_USERS = [
  { key: "worker", label: "Worker", who: "Rajan Mehta · Welder", icon: HardHat, login: async () => { await authApi.requestOtp("9876543210"); return authApi.verifyOtp("9876543210", "123456"); } },
  { key: "employer", label: "HR / Employer", who: "Vedanta Aluminium", icon: Building2, login: () => authApi.login("hr@vedanta.demo", "demo1234") },
  { key: "admin", label: "Admin", who: "IndustriaLink team", icon: ShieldCheck, login: () => authApi.login("admin@industrialink.demo", "demo1234") },
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
      <p className="text-caption text-ink-muted">For testing only. Not shown in production.</p>
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
