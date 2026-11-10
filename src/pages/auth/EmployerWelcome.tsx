import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import type { Company, HiringType, Sector } from "@/types";
import { HIRING_TYPE_LABEL, SECTOR_LABEL } from "@/lib/labels";
import { employerApi } from "@/api/employer";
import { authApi } from "@/api/auth";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/app/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Misc";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getHandoff } from "@/lib/handoff";
import { useCompany } from "@/hooks/useCompany";
import { CompanyDocsUpload, LogoPicker, useCompanyDocCount } from "@/components/domain/CompanyFields";

export default function EmployerWelcome() {
  const [step, setStep] = useState(0);
  const draft = getHandoff().draft; // job post started on the landing site
  const [c, setC] = useState<Partial<Company>>({ sector: "metals", size: "50–200", location: { city: draft?.city ?? "", state: draft?.state ?? "" } });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const docCount = useCompanyDocCount();
  const company = useCompany();
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!c.location?.city?.trim()) e.city = "Enter the city of your main site.";
    if (!c.location?.state?.trim()) e.state = "Enter the state.";
    if (!c.hiringType) e.hiringType = "Choose one.";
    if (!/^[6-9]\d{9}$/.test(c.hrPhone ?? "")) e.hrPhone = "Enter a 10-digit mobile number.";
    if (c.pincode && !/^\d{6}$/.test(c.pincode)) e.pincode = "Pincode has 6 digits.";
    if (c.gstNumber && !/^[0-9A-Z]{15}$/.test(c.gstNumber)) e.gst = "GST number has 15 letters and numbers.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const finish = async () => {
    setBusy(true);
    try {
      await employerApi.updateCompany(c);
      setUser(await authApi.completeOnboarding());
      qc.invalidateQueries();
      navigate(draft ? "/employer/jobs/new" : "/employer", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper steps={["Company details", "Verification", "Done"]} current={step} />
      <Card className="mt-8">
        <CardBody className="space-y-5 p-6">
          {step === 0 && (
            <>
              <h1 className="text-h1">Tell us about your company</h1>
              <LogoPicker name={company.data?.name ?? ""} sector={c.sector ?? "metals"} value={c.logoUrl} onChange={(logoUrl) => setC({ ...c, logoUrl })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="You are" required error={errors.hiringType} className="sm:col-span-2">{(id, d) => (
                  <Select id={id} aria-describedby={d} invalid={!!errors.hiringType} value={c.hiringType ?? ""} onChange={(e) => setC({ ...c, hiringType: (e.target.value || undefined) as HiringType | undefined })}>
                    <option value="">Choose…</option>
                    <option value="direct">{HIRING_TYPE_LABEL.direct}: hiring for our own sites</option>
                    <option value="agency">{HIRING_TYPE_LABEL.agency}: hiring for other companies</option>
                  </Select>
                )}</Field>
                <Field label="Industry">{(id) => (
                  <Select id={id} value={c.sector} onChange={(e) => setC({ ...c, sector: e.target.value as Sector })}>
                    {(Object.keys(SECTOR_LABEL) as Sector[]).map((s) => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
                  </Select>
                )}</Field>
                <Field label="Company size">{(id) => (
                  <Select id={id} value={c.size} onChange={(e) => setC({ ...c, size: e.target.value })}>
                    {["1–50", "50–200", "200–1000", "1000+"].map((s) => <option key={s} value={s}>{s} people</option>)}
                  </Select>
                )}</Field>
                <Field label="City" required error={errors.city}>{(id) => <Input id={id} value={c.location?.city} invalid={!!errors.city} onChange={(e) => setC({ ...c, location: { ...c.location!, city: e.target.value } })} />}</Field>
                <Field label="State" required error={errors.state}>{(id) => <Input id={id} value={c.location?.state} invalid={!!errors.state} onChange={(e) => setC({ ...c, location: { ...c.location!, state: e.target.value } })} />}</Field>
                <Field label="Address" hint="Area, road or plant gate">{(id, d) => <Input id={id} aria-describedby={d} value={c.address ?? ""} onChange={(e) => setC({ ...c, address: e.target.value || undefined })} />}</Field>
                <Field label="Pincode" error={errors.pincode}>{(id) => <Input id={id} inputMode="numeric" maxLength={6} value={c.pincode ?? ""} invalid={!!errors.pincode} onChange={(e) => setC({ ...c, pincode: e.target.value.replace(/\D/g, "") || undefined })} />}</Field>
                <Field label="Your designation">{(id) => <Input id={id} placeholder="e.g. HR Manager" value={c.hrDesignation ?? ""} onChange={(e) => setC({ ...c, hrDesignation: e.target.value || undefined })} />}</Field>
                <Field label="Your mobile number" required error={errors.hrPhone} hint="Our team may call to verify. Not shown to workers.">{(id, d) => <Input id={id} aria-describedby={d} prefix="+91" inputMode="numeric" maxLength={10} value={c.hrPhone ?? ""} invalid={!!errors.hrPhone} onChange={(e) => setC({ ...c, hrPhone: e.target.value.replace(/\D/g, "") || undefined })} />}</Field>
                <Field label="GST number" hint="Helps us verify you faster" error={errors.gst}>{(id, d) => <Input id={id} aria-describedby={d} value={c.gstNumber ?? ""} invalid={!!errors.gst} onChange={(e) => setC({ ...c, gstNumber: e.target.value.toUpperCase() })} maxLength={15} />}</Field>
                <Field label="Website">{(id) => <Input id={id} value={c.website ?? ""} onChange={(e) => setC({ ...c, website: e.target.value })} />}</Field>
              </div>
              <Field label="About the company" hint="2–3 lines that workers will see">{(id, d) => <Textarea id={id} aria-describedby={d} value={c.about ?? ""} onChange={(e) => setC({ ...c, about: e.target.value })} />}</Field>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="text-h1">Upload a verification document</h1>
              <p className="text-body text-ink-secondary">GST certificate, Udyam certificate or company registration. Only our team sees it. We usually check it within 1 working day.</p>
              <CompanyDocsUpload />
            </>
          )}
          {step === 2 && (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-bg text-warning-fg"><Clock className="h-7 w-7" aria-hidden /></span>
              <h1 className="mt-4 text-h1">Your company is under review</h1>
              <p className="mx-auto mt-2 max-w-md text-body text-ink-secondary">You can create draft jobs now. You'll be able to publish them as soon as we verify your company.</p>
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          {step > 0 && step < 2 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
          {step === 0 && <Button onClick={() => validate() && setStep(1)}>Continue</Button>}
          {step === 1 && <Button onClick={() => setStep(2)}>{docCount ? "Submit for review" : "Skip for now"}</Button>}
          {step === 2 && <Button onClick={finish} loading={busy}>{draft ? "Continue to your job post" : "Go to dashboard"}</Button>}
        </div>
      </Card>
    </div>
  );
}
