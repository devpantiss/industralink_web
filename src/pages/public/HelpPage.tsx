import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, LifeBuoy, Mail, MessageCircle, Phone, ShieldAlert } from "lucide-react";
import { publicApi } from "@/api/extra";
import { errorMessage } from "@/api/client";
import { homeFor, useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

/** Placeholder support details. Replace with the real ones before launch. */
const SUPPORT = { phone: "1800 000 0000", whatsapp: "910000000000", email: "support@industrialink.in", hours: "Mon–Sat, 9 AM – 6 PM" };

const TOPICS = ["Change my mobile number", "I can't log in", "Problem with a job or company", "Someone asked me for money", "Delete my account", "Company verification", "Other"];

const FAQ: { q: string; a: string; who: "worker" | "employer" | "all" }[] = [
  { who: "worker", q: "Do I have to pay anything?", a: "No. IndustriaLink is free for workers. If anyone asks you for money for a job, uniform or \"registration\", don't pay. Report the job and tell us." },
  { who: "worker", q: "I don't have a resume. Can I still apply?", a: "Yes. Your IndustriaLink profile works as your resume. Add your trade, experience, education and a photo of any certificate." },
  { who: "worker", q: "When can I call HR?", a: "Once the company shortlists you, HR's number and a Message button appear on your application. This stops spam calls for HR and keeps your number private." },
  { who: "worker", q: "How do I change my mobile number?", a: "Send us a request below with your old and new number. We check it and change it within 1 working day." },
  { who: "employer", q: "Why can't I publish jobs yet?", a: "We check every company before its jobs go live, usually within 1 working day. You can save jobs as drafts meanwhile." },
  { who: "employer", q: "Can I see a candidate's documents?", a: "Yes. Everyone who applies to your job shares their profile, resume and certificates with you." },
  { who: "all", q: "How do I delete my account?", a: "Go to Settings → Delete account. Your profile and documents are removed straight away." },
];

export default function HelpPage() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [topic, setTopic] = useState(sp.get("topic") ?? TOPICS[0]!);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const faqs = FAQ.filter((f) => f.who === "all" || !user || user.role === f.who || user.role === "admin");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await publicApi.support({ topic, message: message.trim(), name: name.trim() || undefined, contact: contact.trim() || undefined });
      setSent(true);
      toast.success("Request sent. We'll reply within 1 working day.");
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to={user ? homeFor(user.role) : "/login"} className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-h3 font-semibold">IndustriaLink</span>
          </Link>
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(user ? homeFor(user.role) : "/login"))} className="text-body font-medium text-primary hover:underline">← Back</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-h1"><LifeBuoy className="h-6 w-6 text-primary" aria-hidden /> Help & support</h1>
            <p className="mt-1 text-body text-ink-secondary">Quick answers first. Still stuck? Send us a request and a real person will reply.</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg" aria-hidden />
            <p className="text-body text-ink"><span className="font-semibold">Asked to pay for a job?</span> Don't pay. Report the job from its page, or choose "Someone asked me for money" below.</p>
          </div>

          <Card>
            <CardHeader title="Common questions" />
            <ul className="divide-y divide-border">
              {faqs.map((f) => (
                <li key={f.q}>
                  <details className="group px-5 py-3.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-medium text-ink">
                      {f.q}<ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-2 text-body text-ink-secondary">{f.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Send us a request" description="We reply within 1 working day." />
            <CardBody>
              {sent ? (
                <div className="py-4 text-center">
                  <p className="text-h3 text-ink">Thanks, we got it.</p>
                  <p className="mt-1 text-body text-ink-secondary">We'll reply on {user ? (user.phone ? `+91 ${user.phone}` : user.email) : contact}.</p>
                  <Button variant="secondary" className="mt-4" onClick={() => { setSent(false); setMessage(""); }}>Send another</Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4" noValidate>
                  {!user && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Your name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</Field>
                      <Field label="Mobile or email" required>{(id) => <Input id={id} value={contact} onChange={(e) => setContact(e.target.value)} />}</Field>
                    </div>
                  )}
                  <Field label="Topic">{(id) => <Select id={id} value={topic} onChange={(e) => setTopic(e.target.value)}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</Select>}</Field>
                  <Field label="What happened?" error={error} hint={topic === "Change my mobile number" ? "Write your old and new number." : undefined}>
                    {(id, d) => <Textarea id={id} aria-describedby={d} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} invalid={!!error} />}
                  </Field>
                  <Button type="submit" loading={busy} loadingText="Sending…">Send request</Button>
                </form>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-3 lg:pt-16">
          <Card>
            <CardHeader title="Contact us" description={SUPPORT.hours} />
            <CardBody className="space-y-3 text-body">
              <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-ink-muted" aria-hidden /><span><span className="block text-caption text-ink-muted">Toll-free</span><span className="select-all font-medium text-ink">{SUPPORT.phone}</span></span></p>
              <a href={`https://wa.me/${SUPPORT.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-primary"><MessageCircle className="h-4 w-4 text-green-600" aria-hidden /><span><span className="block text-caption text-ink-muted">WhatsApp</span><span className="font-medium">Chat with us</span></span></a>
              <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-ink-muted" aria-hidden /><span><span className="block text-caption text-ink-muted">Email</span><span className="select-all font-medium text-ink">{SUPPORT.email}</span></span></p>
            </CardBody>
          </Card>
          <p className="px-1 text-caption text-ink-muted">Demo: these contact details are placeholders.</p>
        </aside>
      </main>
    </div>
  );
}
