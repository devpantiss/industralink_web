import { useState, type FormEvent, type ReactNode } from "react";
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
        {USE_MOCKS && <DemoAccounts audience={as} />}
      </div>
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

function DemoAccounts({ audience }: { audience: Audience }) {
  const rows = audience === "worker"
    ? [{ role: "Worker", login: "Mobile 9876543210", hint: "any 6-digit code" }]
    : [
        { role: "Employer", login: "hr@vedanta.demo", hint: "demo1234" },
        { role: "Employer (not verified)", login: "hr@eastline.demo", hint: "demo1234" },
      ];
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border-strong bg-surface-muted/60 p-4">
      <p className="text-small font-semibold text-ink">Demo accounts</p>
      <ul className="mt-2 space-y-1.5 text-small text-ink-secondary">
        {rows.map((r) => <li key={r.login}><span className="font-medium text-ink">{r.role}:</span> {r.login} · <span className="text-ink-muted">{r.hint}</span></li>)}
      </ul>
      <p className="mt-3 text-caption text-ink-muted">Admin? Use <Link to="/admin/login" className="font-medium text-primary hover:underline">/admin/login</Link></p>
    </div>
  );
}
