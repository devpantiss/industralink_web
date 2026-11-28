import { useEffect, useRef, useState, type FormEvent } from "react";
import { authApi } from "@/api/auth";
import { errorCode, errorMessage } from "@/api/client";
import type { AuthResponse } from "@/types";
import { t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { OrDivider } from "@/components/ui/OrDivider";
import { Modal } from "@/components/ui/Overlay";

/**
 * "Sign in / Sign up with Google" on the web: Google Identity Services (free).
 * Google's own button (and the One Tap prompt on the login page) gives an ID token;
 * POST /auth/google checks it and logs in or creates the account.
 * Google only hands out the token from its own button, so the button is Google's, styled to fit.
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

interface GoogleId {
  initialize(options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    use_fedcm_for_prompt?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  prompt(): void;
  cancel(): void;
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

/** Google's script, loaded once for the whole app. */
let script: Promise<GoogleId> | null = null;
/** Google calls one callback for the page; it forwards to whichever button is on screen. */
let onCredential: ((credential: string) => void) | null = null;

function loadGoogle(): Promise<GoogleId> {
  script ??= new Promise<GoogleId>((resolve, reject) => {
    const ready = () => {
      const id = window.google?.accounts?.id;
      if (!id) return reject(new Error("Google sign-in could not load."));
      id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => response.credential && onCredential?.(response.credential),
        use_fedcm_for_prompt: true,
        cancel_on_tap_outside: true,
        itp_support: true,
      });
      resolve(id);
    };
    if (window.google?.accounts?.id) return ready();
    const tag = document.createElement("script");
    tag.src = "https://accounts.google.com/gsi/client";
    tag.async = true;
    tag.onload = ready;
    tag.onerror = () => {
      script = null; // try again next time (e.g. the internet came back)
      reject(new Error("Google sign-in could not load. Check your internet."));
    };
    document.head.appendChild(tag);
  });
  return script;
}

interface Props {
  mode: "signin" | "signup";
  /** The tab the person chose; the server refuses an account of the other kind. */
  role: "worker" | "employer";
  /** HR sign-up: the company name already typed in the form, so it isn't asked again. */
  companyName?: string;
  onSuccess: (res: AuthResponse) => void;
}

/** Google's button, the "or" line under it, and the company-name step for new HR accounts. */
export function GoogleSection({ mode, role, companyName, onSuccess }: Props) {
  const theme = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [askCompany, setAskCompany] = useState<string | null>(null); // the waiting Google token
  const [company, setCompany] = useState("");

  // The latest props, for Google's callback (set once per page).
  const latest = useRef({ role, companyName, onSuccess });
  latest.current = { role, companyName, onSuccess };

  const send = async (credential: string, name?: string) => {
    const { role: tab, onSuccess: done } = latest.current;
    setBusy(true);
    setError(undefined);
    try {
      done(await authApi.google(credential, tab, name));
      setAskCompany(null);
    } catch (err) {
      if (errorCode(err) === "COMPANY_NAME_NEEDED") {
        setCompany(latest.current.companyName ?? "");
        setAskCompany(credential);
      } else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (!CLIENT_ID || !box.current) return;
    let alive = true;
    onCredential = (credential) => {
      const { role: tab, companyName: name } = latest.current;
      void sendRef.current(credential, tab === "employer" ? name?.trim() || undefined : undefined);
    };
    loadGoogle()
      .then((google) => {
        if (!alive || !box.current) return;
        box.current.replaceChildren();
        google.renderButton(box.current, {
          type: "standard",
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "rectangular",
          text: mode === "signup" ? "signup_with" : "signin_with",
          logo_alignment: "center",
          width: Math.min(400, Math.max(240, box.current.offsetWidth)),
        });
        // One Tap: the "Continue as …" card, only on the login page.
        if (mode === "signin") google.prompt();
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
      window.google?.accounts?.id?.cancel();
    };
  }, [mode, theme]);

  if (!CLIENT_ID) return null;

  const submitCompany = (e: FormEvent) => {
    e.preventDefault();
    if (company.trim().length < 2) return setError("Enter your company or factory name.");
    if (askCompany) void send(askCompany, company.trim());
  };

  return (
    <div>
      <div ref={box} className="flex h-11 justify-center" aria-busy={busy} />
      {error && !askCompany && <p role="alert" className="mt-2 text-center text-small text-danger-fg">{error}</p>}
      <OrDivider label={t("or")} />

      <Modal open={!!askCompany} onClose={() => setAskCompany(null)} title="One last step"
        footer={<Button type="submit" form="google-company" loading={busy}>Register company</Button>}>
        <form id="google-company" onSubmit={submitCompany} noValidate>
          <p className="mb-4 text-body text-ink-secondary">Your company name. We check every company before its jobs go live.</p>
          <Field label="Company or factory name" error={askCompany ? error : undefined}>
            {(id, d) => <Input id={id} aria-describedby={d} autoComplete="organization" value={company}
              onChange={(e) => setCompany(e.target.value)} invalid={!!error} autoFocus />}
          </Field>
        </form>
      </Modal>
    </div>
  );
}
