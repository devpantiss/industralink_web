import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import type { Benefit, ExperienceBand, Job, JobInput, JobType, PayPeriod, Shift, Trade } from "@/types";
import { BENEFIT_LABEL, EXPERIENCE_LABEL, JOB_TYPE_LABEL, QUALIFICATIONS, SHIFT_LABEL, TRADE_LABEL } from "@/lib/labels";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Checkbox, Chip, Field, Input, Select } from "@/components/ui/Field";
import { PageHeader, Stepper } from "@/components/ui/Misc";
import { ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Overlay";
import { JobCard } from "@/components/domain/JobCard";

/** Pre-filled starting points for common trades, so HR can post in under a minute. */
const TEMPLATES: Partial<Record<Trade, Partial<JobInput>>> = {
  welder: { title: "Welder (ITI)", qualifications: ["ITI"], payMin: 18000, payMax: 22000, benefits: ["food", "pf_esi"], responsibilities: ["Arc / MIG welding as per drawing", "Gas cutting and grinding", "Follow safety permits"], requirements: ["ITI in Welder trade", "1+ year experience"] },
  driver: { title: "Truck Driver (HMV)", payMin: 22000, payMax: 26000, benefits: ["food", "overtime"], responsibilities: ["Drive company trucks on given routes", "Daily vehicle check"], requirements: ["Valid HMV licence", "3+ years driving experience"] },
  electrician: { title: "Electrician (ITI)", qualifications: ["ITI"], payMin: 20000, payMax: 25000, benefits: ["pf_esi"], responsibilities: ["Maintain plant wiring and panels", "Fault finding"], requirements: ["ITI Electrician", "Wireman licence preferred"] },
  helper: { title: "Helper", payMin: 550, payMax: 600, payPeriod: "day", experience: "fresher", benefits: ["food"], responsibilities: ["Loading and unloading", "Housekeeping"], requirements: ["Physically fit"] },
  fitter: { title: "Fitter (ITI)", qualifications: ["ITI"], payMin: 17000, payMax: 21000, benefits: ["pf_esi"], responsibilities: ["Fitting and maintenance of machines"], requirements: ["ITI Fitter"] },
};

const EMPTY: JobInput = {
  title: "", trade: "welder", sector: "metals", location: { city: "", state: "" }, payPeriod: "month", shift: "day",
  jobType: "full_time", openings: 1, experience: "1_2", qualifications: [], benefits: [], responsibilities: [], requirements: [],
  status: "draft", hrPhone: "", allowCalls: true, callHours: "10 AM – 6 PM",
};

const CALL_HOURS = ["9 AM – 5 PM", "10 AM – 6 PM", "11 AM – 7 PM", "Anytime"];

type Errors = Partial<Record<"title" | "city" | "pay" | "walkIn" | "phone" | "openings" | "fee", string>>;

export default function PostJob() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const sourceId = id ?? sp.get("from") ?? undefined;
  const source = useQuery({ queryKey: qk.employer.job(sourceId ?? "none"), queryFn: () => employerApi.job(sourceId!), enabled: !!sourceId });
  const company = useCompany();

  if ((sourceId && source.isLoading) || company.isLoading) return <ListSkeleton count={2} lines={5} />;
  if (source.isError || company.isError) return <ErrorState onRetry={() => { source.refetch(); company.refetch(); }} />;
  return <JobForm key={sourceId ?? "new"} editing={id ? source.data : undefined} copyOf={!id ? source.data : undefined} verified={company.data?.verification === "approved"} defaults={{ sector: company.data!.sector, location: company.data!.location }} sites={company.data?.sites ?? []} />;
}

function JobForm({ editing, copyOf, verified, defaults, sites = [] }: { editing?: Job; copyOf?: Job; verified: boolean; defaults: Pick<JobInput, "sector" | "location">; sites?: string[] }) {
  const base = editing ?? copyOf;
  const [f, setF] = useState<JobInput>(() => base
    ? { ...pick(base), title: copyOf ? `Copy of ${base.title}` : base.title, status: copyOf ? "draft" : base.status }
    : { ...EMPTY, ...defaults });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [noFee, setNoFee] = useState(!!editing);
  const [dirty, setDirty] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const dirtyRef = useRef(false);
  const set = (changes: Partial<JobInput>) => { setF((s) => ({ ...s, ...changes })); setDirty(true); dirtyRef.current = true; };

  // Ask before leaving the form for another page with unsaved changes.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useMutation({
    mutationFn: (status: Job["status"]) => {
      const body = { ...f, status, title: f.title.trim() };
      return editing ? employerApi.updateJob(editing.id, body) : employerApi.createJob(body);
    },
    onSuccess: (job, status) => {
      setDirty(false);
      dirtyRef.current = false;
      qc.invalidateQueries({ queryKey: qk.employer.all });
      toast.success(status === "active" ? "Job published! Workers can see it now." : "Saved as draft");
      navigate(status === "active" ? `/employer/jobs/${job.id}` : "/employer/jobs?tab=draft");
    },
    onError: (e) => {
      toast.error(errorMessage(e));
      if (errorCode(e) === "NOT_VERIFIED") save.reset();
    },
  });

  const validate = (s: number): boolean => {
    const e: Errors = {};
    if (s >= 0) {
      if (!f.title.trim()) e.title = "Enter a job title.";
      if (!f.location.city.trim()) e.city = "Enter the work site city.";
      if (f.openings < 1) e.openings = "At least 1 opening.";
      if (f.jobType === "walk_in" && (!f.walkIn?.date || !f.walkIn.address)) e.walkIn = "Add the walk-in date and address.";
      if (f.walkIn?.date && new Date(`${f.walkIn.date}T23:59`) < new Date()) e.walkIn = "Walk-in date can't be in the past.";
    }
    if (s >= 1) {
      if (!f.payMin && !f.payMax) e.pay = "Add the pay. Jobs without pay get far fewer applicants.";
      else if (f.payMin && f.payMax && f.payMin > f.payMax) e.pay = "Minimum must be less than maximum.";
      if (f.allowCalls && !/^[6-9]\d{9}$/.test(f.hrPhone ?? "")) e.phone = "Enter a 10-digit mobile number for shortlisted workers.";
    }
    if (s >= 2 && !noFee) e.fee = "Please confirm you won't charge workers.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate(step) && setStep(step + 1);
  const applyTemplate = (t: Trade) => set({ trade: t, ...(TEMPLATES[t] ?? { title: TRADE_LABEL[t] }) });
  const preview = { ...f, id: "preview", companyId: "", companyName: "Your company", companyVerified: verified, postedAt: new Date().toISOString(), applicantsCount: 0, newApplicantsCount: 0, saved: false, status: "active" as const, title: f.title || "Job title" };

  return (
    <div>
      <PageHeader title={editing ? "Edit job" : "Post a job"} breadcrumb={{ label: "Jobs", to: "/employer/jobs" }}
        description={editing && editing.applicantsCount > 0 ? `${editing.applicantsCount} people already applied and saw the earlier version.` : undefined} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardBody className="space-y-6 p-5 sm:p-6">
            <Stepper steps={["Basics", "Pay & requirements", "Review"]} current={step} />

            {step === 0 && (
              <div className="space-y-5">
                {!editing && (
                  <div>
                    <p className="mb-2 text-small font-medium text-ink">Start from a template</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(TEMPLATES) as Trade[]).map((t) => <Chip key={t} selected={f.trade === t && f.title === TEMPLATES[t]!.title} onClick={() => applyTemplate(t)}>{TRADE_LABEL[t]}</Chip>)}
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Job title" required error={errors.title} className="sm:col-span-2">{(id, d) => <Input id={id} aria-describedby={d} value={f.title} invalid={!!errors.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Welder (ITI)" maxLength={80} />}</Field>
                  <Field label="Trade">{(id) => (
                    <Select id={id} value={f.trade} onChange={(e) => set({ trade: e.target.value as Trade })}>
                      {(Object.keys(TRADE_LABEL) as Trade[]).map((t) => <option key={t} value={t}>{TRADE_LABEL[t]}</option>)}
                    </Select>
                  )}</Field>
                  <Field label="Site / plant name" hint={sites.length ? "Optional. Pick one of your sites or type a new one." : "Optional, e.g. Smelter Plant 2. Add your sites on the Company page to pick them here."}>{(id, d) => <>
                    <Input id={id} aria-describedby={d} list="company-sites" value={f.siteName ?? ""} onChange={(e) => set({ siteName: e.target.value || undefined })} />
                    <datalist id="company-sites">{sites.map((x) => <option key={x} value={x} />)}</datalist>
                    {sites.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{sites.map((x) => <button key={x} type="button" onClick={() => set({ siteName: x })} className={`rounded-full border px-2.5 py-0.5 text-caption font-medium ${f.siteName === x ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-secondary hover:border-border-strong"}`}>{x}</button>)}</div>}
                  </>}</Field>
                  <Field label="Number of openings" error={errors.openings}>{(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} value={f.openings} onChange={(e) => set({ openings: Number(e.target.value) })} />}</Field>
                  <Field label="Work site city" required error={errors.city}>{(id, d) => <Input id={id} aria-describedby={d} value={f.location.city} invalid={!!errors.city} onChange={(e) => set({ location: { ...f.location, city: e.target.value } })} />}</Field>
                  <Field label="State">{(id) => <Input id={id} value={f.location.state} onChange={(e) => set({ location: { ...f.location, state: e.target.value } })} />}</Field>
                </div>
                <div>
                  <p className="mb-2 text-small font-medium text-ink">How will workers apply?</p>
                  <div className="flex flex-wrap gap-2">
                    {(["full_time", "contract", "walk_in"] as JobType[]).map((t) => <Chip key={t} selected={f.jobType === t} onClick={() => set({ jobType: t, walkIn: t === "walk_in" ? f.walkIn ?? { date: "", time: "09:00", address: "" } : undefined })}>{JOB_TYPE_LABEL[t]}</Chip>)}
                  </div>
                </div>
                {f.jobType === "walk_in" && (
                  <div className="grid gap-4 rounded-lg bg-surface-muted p-4 sm:grid-cols-2">
                    <Field label="Walk-in date" required>{(id) => <Input id={id} type="date" min={new Date().toISOString().slice(0, 10)} value={f.walkIn?.date ?? ""} onChange={(e) => set({ walkIn: { ...f.walkIn!, date: e.target.value } })} />}</Field>
                    <Field label="Time">{(id) => <Input id={id} type="time" value={f.walkIn?.time ?? ""} onChange={(e) => set({ walkIn: { ...f.walkIn!, time: e.target.value } })} />}</Field>
                    <Field label="Address" required error={errors.walkIn} className="sm:col-span-2">{(id, d) => <Input id={id} aria-describedby={d} value={f.walkIn?.address ?? ""} invalid={!!errors.walkIn} onChange={(e) => set({ walkIn: { ...f.walkIn!, address: e.target.value } })} placeholder="Gate no., plant name, area" />}</Field>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-small font-medium text-ink">Pay <span className="text-danger-fg">*</span></p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px]">
                    <Input aria-label="Minimum pay" prefix="₹" inputMode="numeric" placeholder="Min" value={f.payMin ?? ""} invalid={!!errors.pay} onChange={(e) => set({ payMin: Number(e.target.value.replace(/\D/g, "")) || undefined })} />
                    <Input aria-label="Maximum pay" prefix="₹" inputMode="numeric" placeholder="Max" value={f.payMax ?? ""} invalid={!!errors.pay} onChange={(e) => set({ payMax: Number(e.target.value.replace(/\D/g, "")) || undefined })} />
                    <Select aria-label="Pay period" value={f.payPeriod} onChange={(e) => set({ payPeriod: e.target.value as PayPeriod })}>
                      <option value="month">per month</option>
                      <option value="day">per day</option>
                    </Select>
                  </div>
                  {errors.pay && <p role="alert" className="mt-1.5 text-small text-danger-fg">{errors.pay}</p>}
                </div>
                <Group label="Shift">{(["day", "night", "rotational"] as Shift[]).map((s) => <Chip key={s} selected={f.shift === s} onClick={() => set({ shift: s })}>{SHIFT_LABEL[s]}</Chip>)}</Group>
                <Group label="Benefits">{(Object.keys(BENEFIT_LABEL) as Benefit[]).map((b) => <Chip key={b} selected={f.benefits.includes(b)} onClick={() => set({ benefits: f.benefits.includes(b) ? f.benefits.filter((x) => x !== b) : [...f.benefits, b] })}>{BENEFIT_LABEL[b]}</Chip>)}</Group>
                <Group label="Experience needed">{(Object.keys(EXPERIENCE_LABEL) as ExperienceBand[]).map((x) => <Chip key={x} selected={f.experience === x} onClick={() => set({ experience: x })}>{EXPERIENCE_LABEL[x]}</Chip>)}</Group>
                <Group label="Qualification">{QUALIFICATIONS.map((q) => <Chip key={q} selected={f.qualifications.includes(q)} onClick={() => set({ qualifications: f.qualifications.includes(q) ? f.qualifications.filter((x) => x !== q) : [...f.qualifications, q] })}>{q}</Chip>)}</Group>
                <ListEditor label="What they'll do" items={f.responsibilities} onChange={(v) => set({ responsibilities: v })} placeholder="e.g. Weld steel structures" />
                <ListEditor label="What they need" items={f.requirements} onChange={(v) => set({ requirements: v })} placeholder="e.g. ITI in Welder trade" />
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <Checkbox label="Let shortlisted candidates call or WhatsApp us" checked={f.allowCalls} onChange={(v) => set({ allowCalls: v })}
                    hint="Your number is shown only to people you shortlist, never on the public job post." />
                  {f.allowCalls && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="HR mobile number" required error={errors.phone}>{(id, d) => <Input id={id} aria-describedby={d} prefix="+91" inputMode="numeric" maxLength={10} value={f.hrPhone ?? ""} invalid={!!errors.phone} onChange={(e) => set({ hrPhone: e.target.value.replace(/\D/g, "") })} />}</Field>
                      <Field label="Call hours">{(id) => (
                        <Select id={id} value={f.callHours ?? CALL_HOURS[1]} onChange={(e) => set({ callHours: e.target.value })}>
                          {CALL_HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                        </Select>
                      )}</Field>
                    </div>
                  )}
                </div>
                <Field label="Last date to apply" hint="Optional">{(id, d) => <Input id={id} aria-describedby={d} type="date" min={new Date().toISOString().slice(0, 10)} value={f.deadline?.slice(0, 10) ?? ""} onChange={(e) => set({ deadline: e.target.value ? new Date(`${e.target.value}T23:59`).toISOString() : undefined })} />}</Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-h2">Check and publish</h2>
                <p className="text-body text-ink-secondary">The card on the right is exactly what workers will see on their phone.</p>
                <Checkbox label="I confirm we will not charge workers any fee for this job." checked={noFee} onChange={setNoFee} hint="IndustriaLink removes jobs that ask workers for money." />
                {errors.fee && <p role="alert" className="text-small text-danger-fg">{errors.fee}</p>}
                {!verified && <p className="rounded-md bg-warning-bg px-3 py-2 text-small text-warning-fg">You can publish after your company is verified. Save it as a draft for now.</p>}
              </div>
            )}
          </CardBody>

          <div className="glass sticky bottom-[88px] flex flex-wrap items-center gap-2 rounded-b-lg border-t px-5 py-3 sm:bottom-0 sm:px-6">
            {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
            <div className="flex-1" />
            {editing?.status !== "active" && (
              <Button variant="secondary" onClick={() => validate(-1) && save.mutate("draft")} loading={save.isPending && save.variables === "draft"} disabled={!f.title.trim()}>Save draft</Button>
            )}
            {step < 2 ? <Button onClick={next}>Continue</Button> : (
              <Button onClick={() => validate(2) && save.mutate("active")} disabled={!verified} title={!verified ? "Available after verification" : undefined}
                loading={save.isPending && save.variables === "active"} loadingText="Publishing…">{editing?.status === "active" ? "Save changes" : "Publish job"}</Button>
            )}
          </div>
        </Card>

        <ConfirmDialog open={blocker.state === "blocked"} onClose={() => blocker.reset?.()} onConfirm={() => blocker.proceed?.()}
          title="Discard changes?" confirmLabel="Discard" message="You have changes that are not saved. Save a draft first if you want to keep them." />

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-ink-muted">Live preview</p>
            <div className="pointer-events-none"><JobCard job={preview} /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function pick(j: Job): JobInput {
  const { id: _id, companyId: _c, companyName: _n, companyVerified: _v, postedAt: _p, applicantsCount: _a, newApplicantsCount: _na, ...rest } = j;
  return rest;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-small font-medium text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState("");
  const add = () => { if (v.trim()) onChange([...items, v.trim()]); setV(""); };
  return (
    <div>
      <p className="mb-2 text-small font-medium text-ink">{label}</p>
      <ul className="mb-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={`${it}-${i}`} className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-body">
            <span className="flex-1">{it}</span>
            <button aria-label={`Remove ${it}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-ink-muted hover:text-danger-fg"><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={add}>Add</Button>
      </div>
    </div>
  );
}
