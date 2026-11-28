import { t } from "@/lib/i18n";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { passwordApi } from "@/api/extra";
import { errorMessage } from "@/api/client";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { AuthLayout } from "./AuthLayout";

/** Step 1: ask for the email. The same message shows whether or not the account exists. */
export function ForgotPassword() {
  const [sp] = useSearchParams();
  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try { await passwordApi.forgot(email.trim()); setSent(true); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  if (sent) {
    return (
      <AuthLayout side="employer" title="Check your email" subtitle={<>If <span className="font-medium text-ink">{email}</span> has an account, we sent a link to reset the password. It works for 1 hour.</>}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-fg"><MailCheck className="h-7 w-7" aria-hidden /></span>
          <p className="text-small text-ink-secondary">No email after 5 minutes? Check spam, or <button className="font-medium text-primary hover:underline" onClick={() => setSent(false)}>try again</button>.</p>
          <Link to="/login?as=employer" className="text-body font-medium text-primary hover:underline">Back to log in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout side="employer" title="Reset your password" subtitle="Enter the email you log in with. We'll send you a reset link.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t("Email")} error={error}>{(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} autoFocus />}</Field>
        <Button type="submit" size="lg" loading={busy} loadingText="Sending…">Send reset link</Button>
        <p className="text-center text-small text-ink-secondary">Workers log in with a mobile code, so they don't need a password.</p>
        <Link to="/login?as=employer" className="text-center text-body font-medium text-primary hover:underline">Back to log in</Link>
      </form>
    </AuthLayout>
  );
}

/** Step 2: the link from the email lands here. */
export function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const r = await passwordApi.reset(token, pw);
      toast.success("Password changed. Log in with your new password.");
      navigate(r.role === "admin" ? "/admin/login" : "/login?as=employer", { replace: true });
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  if (!token) {
    return (
      <AuthLayout side="employer" title="Link not valid" subtitle="This reset link is incomplete. Ask for a new one.">
        <LinkButton to="/forgot-password" size="lg" className="w-full">Get a new link</LinkButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout side="employer" title="Choose a new password" subtitle="Use at least 8 characters.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="New password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />}</Field>
        <Field label="Type it again" error={error}>{(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} invalid={!!error} />}</Field>
        <Button type="submit" size="lg" loading={busy} loadingText="Saving…">Save password</Button>
        {error?.includes("expired") && <Link to="/forgot-password" className="text-center text-body font-medium text-primary hover:underline">Get a new link</Link>}
      </form>
    </AuthLayout>
  );
}
