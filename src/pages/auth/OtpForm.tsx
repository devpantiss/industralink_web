import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { authApi } from "@/api/auth";
import { errorCode, errorMessage } from "@/api/client";
import type { AuthResponse } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

/**
 * Phone → OTP flow, shared by login and worker sign-up.
 * Login with an unknown number offers sign-up; sign-up with a known number offers login.
 */
export function OtpForm({ mode, name, initialPhone = "", onSuccess, onWrongMode, submitLabel = "Continue" }: {
  mode: "login" | "signup";
  name?: string;
  initialPhone?: string;
  onSuccess: (r: AuthResponse) => void;
  onWrongMode: (phone: string) => void;
  submitLabel?: string;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState<ReactNode>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const wrongMode = (msg: string, action: string) => (
    <span>
      {msg}{" "}
      <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => onWrongMode(phone)}>{action}</button>
    </span>
  );

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(undefined);
    if (!/^[6-9]\d{9}$/.test(phone)) return setError(t("Enter a valid 10-digit mobile number."));
    setBusy(true);
    try {
      const r = await authApi.requestOtp(phone);
      if (mode === "login" && r.isNewUser) return setError(wrongMode(t("No account with this number yet."), t("Create one now →")));
      if (mode === "signup" && !r.isNewUser) return setError(wrongMode(t("You already have an account with this number."), t("Log in instead →")));
      setStep("code");
      setWait(30);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!/^\d{6}$/.test(code)) return setError(t("Enter the 6-digit code."));
    setBusy(true);
    try {
      onSuccess(await authApi.verifyOtp(phone, code, mode === "signup" ? name : undefined));
    } catch (err) {
      setError(errorCode(err) === "EXISTS" ? wrongMode(errorMessage(err), t("Log in →")) : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (step === "phone") {
    return (
      <form onSubmit={send} className="flex flex-col gap-4" noValidate>
        <Field label={t("Mobile number")} error={error} hint={t("We'll send a 6-digit code by SMS. No password needed.")}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} prefix="+91" inputSize="lg" inputMode="numeric" autoComplete="tel-national" maxLength={10}
              placeholder="98765 43210" value={phone} invalid={!!error} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} autoFocus />
          )}
        </Field>
        <Button type="submit" size="lg" loading={busy} loadingText={t("Sending code…")}>{t("Send code")}</Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="animate-page flex flex-col gap-4" noValidate>
      <p className="text-body text-ink-secondary">
        {t("Code sent to")} <span className="font-medium text-ink">+91 {phone}</span>.{" "}
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setStep("phone"); setCode(""); setError(undefined); }}>{t("Change number")}</button>
      </p>
      <Field label={t("6-digit code")} error={error}>
        {(id, d) => (
          <Input ref={codeRef} id={id} aria-describedby={d} inputSize="lg" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            className="text-center text-h2 tracking-[0.5em]" placeholder="••••••" value={code} invalid={!!error} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        )}
      </Field>
      <Button type="submit" size="lg" loading={busy} loadingText={t("Checking…")}>{t(submitLabel)}</Button>
      <p className="text-center text-small text-ink-muted">
        {wait > 0 ? <>Resend code in 0:{String(wait).padStart(2, "0")}</> : (
          <button type="button" className="font-medium text-primary hover:underline" onClick={() => send()}>Resend code</button>
        )}
      </p>
    </form>
  );
}
