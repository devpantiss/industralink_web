import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Company, HiringType, Sector } from "@/types";
import { HIRING_TYPE_LABEL, SECTOR_LABEL } from "@/lib/labels";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Misc";
import { VerificationBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { VerificationBanner } from "@/components/domain/VerificationBanner";
import { CompanyDocsUpload, LogoPicker, useCompanyDocCount } from "@/components/domain/CompanyFields";

export default function CompanyPage() {
  const q = useCompany();
  const [c, setC] = useState<Company>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const docCount = useCompanyDocCount();
  const qc = useQueryClient();
  const toast = useToast();
  useEffect(() => { if (q.data) setC(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: (resubmit: boolean) => employerApi.updateCompany({ ...c!, sites: (c!.sites ?? []).map((x) => x.trim()).filter(Boolean), resubmit }),
    onSuccess: (_d, resubmit) => { qc.invalidateQueries({ queryKey: qk.employer.all }); toast.success(resubmit ? "Sent for review again" : "Company profile saved"); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading || (q.data && !c)) return <ListSkeleton count={2} lines={4} />;
  if (q.isError || !c) return <ErrorState onRetry={() => q.refetch()} />;
  const set = (changes: Partial<Company>) => setC({ ...c, ...changes });
  const submit = (resubmit: boolean) => {
    const e: Record<string, string> = {};
    if (!c.name.trim()) e.name = "Enter the company name.";
    if (!c.location.city.trim()) e.city = "Enter the city of your main site.";
    if (!c.location.state.trim()) e.state = "Enter the state.";
    if (c.hrPhone && !/^[6-9]\d{9}$/.test(c.hrPhone)) e.hrPhone = "Enter a 10-digit mobile number.";
    if (c.pincode && !/^\d{6}$/.test(c.pincode)) e.pincode = "Pincode has 6 digits.";
    setErrors(e);
    if (Object.keys(e).length) return toast.error("Please fix the highlighted fields.");
    save.mutate(resubmit);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Company" description="Workers see this on every job you post." />
      <VerificationBanner />
      <Card>
        <CardHeader title="Company profile" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><LogoPicker name={c.name} sector={c.sector} value={c.logoUrl} onChange={(logoUrl) => set({ logoUrl })} /></div>
          <Field label="Company name" required error={errors.name} className="sm:col-span-2">{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.name} value={c.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
          <Field label="Industry">{(id) => (
            <Select id={id} value={c.sector} onChange={(e) => set({ sector: e.target.value as Sector })}>
              {(Object.keys(SECTOR_LABEL) as Sector[]).map((s) => <option key={s} value={s}>{SECTOR_LABEL[s]}</option>)}
            </Select>
          )}</Field>
          <Field label="Company size">{(id) => (
            <Select id={id} value={c.size} onChange={(e) => set({ size: e.target.value })}>
              {["1–50", "50–200", "200–1000", "1000+"].map((s) => <option key={s} value={s}>{s} people</option>)}
            </Select>
          )}</Field>
          <Field label="Hiring as" hint="Contractors and agencies hire workers for other companies." className="sm:col-span-2">{(id, d) => (
            <Select id={id} aria-describedby={d} value={c.hiringType ?? ""} onChange={(e) => set({ hiringType: (e.target.value || undefined) as HiringType | undefined })}>
              <option value="">Choose…</option>
              {(Object.keys(HIRING_TYPE_LABEL) as HiringType[]).map((h) => <option key={h} value={h}>{HIRING_TYPE_LABEL[h]}</option>)}
            </Select>
          )}</Field>
          <Field label="City" required error={errors.city}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.city} value={c.location.city} onChange={(e) => set({ location: { ...c.location, city: e.target.value } })} />}</Field>
          <Field label="State" required error={errors.state}>{(id, d) => <Input id={id} aria-describedby={d} invalid={!!errors.state} value={c.location.state} onChange={(e) => set({ location: { ...c.location, state: e.target.value } })} />}</Field>
          <Field label="Address" hint="Area, road or plant gate. Helps workers find you.">{(id, d) => <Input id={id} aria-describedby={d} value={c.address ?? ""} onChange={(e) => set({ address: e.target.value || undefined })} />}</Field>
          <Field label="Pincode" error={errors.pincode}>{(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" maxLength={6} invalid={!!errors.pincode} value={c.pincode ?? ""} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") || undefined })} />}</Field>
          <Field label="Website">{(id) => <Input id={id} value={c.website ?? ""} onChange={(e) => set({ website: e.target.value })} />}</Field>
          <Field label="GST number">{(id) => <Input id={id} value={c.gstNumber ?? ""} maxLength={15} onChange={(e) => set({ gstNumber: e.target.value.toUpperCase() })} />}</Field>
          <Field label="About" className="sm:col-span-2">{(id) => <Textarea id={id} value={c.about ?? ""} onChange={(e) => set({ about: e.target.value })} />}</Field>
          <Field label="HR contact name" hint="Shown to our team during approval, not to workers.">{(id, d) => <Input id={id} aria-describedby={d} value={c.hrName ?? ""} onChange={(e) => set({ hrName: e.target.value || undefined })} />}</Field>
          <Field label="Designation">{(id) => <Input id={id} placeholder="e.g. HR Manager" value={c.hrDesignation ?? ""} onChange={(e) => set({ hrDesignation: e.target.value || undefined })} />}</Field>
          <Field label="HR mobile number" error={errors.hrPhone} hint="Our team may call to verify. It also fills in the HR number on new jobs. Not shown to workers.">
            {(id, d) => <Input id={id} aria-describedby={d} prefix="+91" inputMode="numeric" maxLength={10} invalid={!!errors.hrPhone} value={c.hrPhone ?? ""} onChange={(e) => set({ hrPhone: e.target.value.replace(/\D/g, "") || undefined })} />}
          </Field>
          <Field label="Plants / sites" className="sm:col-span-2" hint="One per line. You can pick these when posting a job.">
            {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} placeholder={"Smelter Plant 2\nPower Plant"} value={(c.sites ?? []).join("\n")}
              onChange={(e) => set({ sites: e.target.value.split("\n").map((x) => x.trimStart()).filter((x, i, all) => x || i === all.length - 1) })} />}
          </Field>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button onClick={() => submit(false)} loading={save.isPending && save.variables === false}>Save changes</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Verification" action={<VerificationBadge status={c.verification} />} />
        <CardBody className="space-y-4">
          {c.verification === "approved" ? (
            <>
              <p className="text-body text-ink-secondary">Your company is verified. Workers see a ✓ Verified badge on your jobs.</p>
              <CompanyDocsUpload locked />
            </>
          ) : (
            <>
              <p className="text-body text-ink-secondary">Upload your GST certificate, Udyam certificate or company registration. Only our team sees it. We usually check it within 1 working day.</p>
              <CompanyDocsUpload />
              {c.verification === "rejected" && (
                <Button onClick={() => (docCount ? submit(true) : toast.error("Upload a document first, so our team can check it."))} loading={save.isPending && save.variables === true}>Re-submit for review</Button>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
