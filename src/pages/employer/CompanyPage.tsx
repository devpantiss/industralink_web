import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Company, Sector } from "@/types";
import { SECTOR_LABEL } from "@/lib/labels";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Misc";
import { VerificationBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { VerificationBanner } from "@/components/domain/VerificationBanner";

export default function CompanyPage() {
  const q = useCompany();
  const [c, setC] = useState<Company>();
  const [docName, setDocName] = useState<string>();
  const qc = useQueryClient();
  const toast = useToast();
  useEffect(() => { if (q.data) setC(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: (resubmit: boolean) => employerApi.updateCompany({ ...c!, sites: (c!.sites ?? []).map((x) => x.trim()).filter(Boolean), resubmit }),
    onSuccess: (_d, resubmit) => { qc.invalidateQueries({ queryKey: qk.employer.all }); toast.success(resubmit ? "Sent for review again" : "Company profile saved"); setDocName(undefined); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading || (q.data && !c)) return <ListSkeleton count={2} lines={4} />;
  if (q.isError || !c) return <ErrorState onRetry={() => q.refetch()} />;
  const set = (changes: Partial<Company>) => setC({ ...c, ...changes });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Company" description="Workers see this on every job you post." />
      <VerificationBanner />
      <Card>
        <CardHeader title="Company profile" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" className="sm:col-span-2">{(id) => <Input id={id} value={c.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
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
          <Field label="City">{(id) => <Input id={id} value={c.location.city} onChange={(e) => set({ location: { ...c.location, city: e.target.value } })} />}</Field>
          <Field label="State">{(id) => <Input id={id} value={c.location.state} onChange={(e) => set({ location: { ...c.location, state: e.target.value } })} />}</Field>
          <Field label="Website">{(id) => <Input id={id} value={c.website ?? ""} onChange={(e) => set({ website: e.target.value })} />}</Field>
          <Field label="GST number">{(id) => <Input id={id} value={c.gstNumber ?? ""} maxLength={15} onChange={(e) => set({ gstNumber: e.target.value.toUpperCase() })} />}</Field>
          <Field label="About" className="sm:col-span-2">{(id) => <Textarea id={id} value={c.about ?? ""} onChange={(e) => set({ about: e.target.value })} />}</Field>
          <Field label="HR contact name" hint="Shown to our team during approval, not to workers.">{(id, d) => <Input id={id} aria-describedby={d} value={c.hrName ?? ""} onChange={(e) => set({ hrName: e.target.value || undefined })} />}</Field>
          <Field label="Designation">{(id) => <Input id={id} placeholder="e.g. HR Manager" value={c.hrDesignation ?? ""} onChange={(e) => set({ hrDesignation: e.target.value || undefined })} />}</Field>
          <Field label="Plants / sites" className="sm:col-span-2" hint="One per line. You can pick these when posting a job.">
            {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} placeholder={"Smelter Plant 2\nPower Plant"} value={(c.sites ?? []).join("\n")}
              onChange={(e) => set({ sites: e.target.value.split("\n").map((x) => x.trimStart()).filter((x, i, all) => x || i === all.length - 1) })} />}
          </Field>
        </CardBody>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button onClick={() => save.mutate(false)} loading={save.isPending && save.variables === false}>Save changes</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Verification" action={<VerificationBadge status={c.verification} />} />
        <CardBody className="space-y-4">
          {c.verification === "approved" ? (
            <p className="text-body text-ink-secondary">Your company is verified. Workers see a ✓ Verified badge on your jobs.</p>
          ) : (
            <>
              <p className="text-body text-ink-secondary">Upload your GST certificate or company registration. We usually check it within 1 working day.</p>
              <FileUpload onFile={(f) => setDocName(f.name)} />
              {docName && <p className="text-body text-success-fg">✓ {docName} ready to send</p>}
              {c.verification === "rejected" && (
                <Button onClick={() => save.mutate(true)} loading={save.isPending && save.variables === true}>Re-submit for review</Button>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
