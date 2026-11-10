import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ImagePlus, Trash2 } from "lucide-react";
import type { CompanyDocType, Sector } from "@/types";
import { COMPANY_DOC_LABEL } from "@/lib/labels";
import { formatBytes, formatDate } from "@/lib/format";
import { resizeImage } from "@/lib/image";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
import { useToast } from "@/components/ui/Toast";
import { CompanyLogo } from "./JobBits";

/** Logo upload with a live preview. The image is shrunk in the browser first. */
export function LogoPicker({ name, sector, value, onChange }: { name: string; sector: Sector; value?: string; onChange: (url: string | undefined) => void }) {
  const toast = useToast();
  const pick = async (f?: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error("Please choose a JPG or PNG image.");
    try { onChange(await resizeImage(f, 200)); } catch { toast.error("Couldn't read this image. Try another one."); }
  };
  return (
    <div className="flex items-center gap-4">
      <CompanyLogo job={{ companyName: name || "Company", sector, companyLogoUrl: value }} size="lg" />
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 text-small font-semibold text-ink hover:bg-surface-muted focus-within:ring-2 focus-within:ring-primary">
            <ImagePlus className="h-4 w-4" aria-hidden /> {value ? "Change logo" : "Upload logo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {value && <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>Remove</Button>}
        </div>
        <p className="text-caption text-ink-muted">Optional. Shown on your jobs. Without one, we show a coloured tile.</p>
      </div>
    </div>
  );
}

/** GST / Udyam / CIN upload for admin approval. Files are sent right away; only admins see them. */
export function CompanyDocsUpload({ locked }: { locked?: boolean }) {
  const docs = useQuery({ queryKey: qk.employer.companyDocs, queryFn: employerApi.companyDocuments });
  const [type, setType] = useState<CompanyDocType>("gst");
  const [progress, setProgress] = useState<number>();
  const qc = useQueryClient();
  const toast = useToast();
  const upload = useMutation({
    mutationFn: (f: File) => employerApi.uploadCompanyDocument(f, type, setProgress),
    onSuccess: (d) => { toast.success(`${d.name} sent to our team`); qc.invalidateQueries({ queryKey: qk.employer.companyDocs }); },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => setProgress(undefined),
  });
  const remove = useMutation({
    mutationFn: employerApi.deleteCompanyDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.employer.companyDocs }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const list = docs.data ?? [];

  return (
    <div className="space-y-4">
      {list.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-ink">{d.name}</p>
                <p className="text-caption text-ink-muted">{COMPANY_DOC_LABEL[d.type]} · {formatBytes(d.sizeBytes)} · {formatDate(d.uploadedAt)}</p>
              </div>
              {!locked && (
                <button type="button" onClick={() => remove.mutate(d.id)} disabled={remove.isPending} aria-label={`Remove ${d.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-bg hover:text-danger-fg"><Trash2 className="h-4 w-4" aria-hidden /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!locked && (
        <>
          <Field label="Document type">{(id) => (
            <Select id={id} value={type} onChange={(e) => setType(e.target.value as CompanyDocType)} className="sm:w-72">
              {(Object.keys(COMPANY_DOC_LABEL) as CompanyDocType[]).map((t) => <option key={t} value={t}>{COMPANY_DOC_LABEL[t]}</option>)}
            </Select>
          )}</Field>
          <FileUpload onFile={(f) => upload.mutate(f)} uploading={upload.isPending} progress={progress} />
        </>
      )}
    </div>
  );
}

/** How many verification files the company has sent. */
export function useCompanyDocCount() {
  const docs = useQuery({ queryKey: qk.employer.companyDocs, queryFn: employerApi.companyDocuments });
  return docs.data?.length ?? 0;
}
