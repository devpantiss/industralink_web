import { useState, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, Eye, FileImage, FileText, FileUp, Pencil, Star, Trash2 } from "lucide-react";
import type { Availability, DocType, ExperienceBand, Shift, Trade, WorkerDocument, WorkerProfile } from "@/types";
import { AVAILABILITY_LABEL, DOC_TYPE_LABEL, EMPLOYMENT_TYPE_LABEL, EXPERIENCE_LABEL, LANGUAGES, LICENCES, QUALIFICATIONS, SHIFT_LABEL, TRADE_LABEL } from "@/lib/labels";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import { DocumentPreview } from "@/components/domain/CandidatePanel";
import { workerApi } from "@/api/worker";
import { qk } from "@/api/keys";
import { errorMessage } from "@/api/client";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar, DefinitionList, PageHeader, ProgressBar, Tabs } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ConfirmDialog, Drawer } from "@/components/ui/Overlay";
import { FileUpload } from "@/components/ui/FileUpload";
import { ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

type Tab = "profile" | "documents";

export default function Profile() {
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as Tab) || "profile";
  const profile = useQuery({ queryKey: qk.worker.profile, queryFn: workerApi.profile });
  const summary = useQuery({ queryKey: qk.worker.summary, queryFn: workerApi.summary });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("My profile")} description={t("Employers see this when you apply. Your profile works as your resume.")} />
      {profile.isLoading ? <ListSkeleton count={2} /> : profile.isError || !profile.data ? <ErrorState onRetry={() => profile.refetch()} /> : (
        <>
          <Card className="mb-6">
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <PhotoPicker profile={profile.data} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-h2">{profile.data.name}</h2>
                  <Badge tone="success" icon={<BadgeCheck className="h-3 w-3" aria-hidden />}>{t("Mobile verified")}</Badge>
                </div>
                <p className="text-body text-ink-secondary">
                  {profile.data.trade ? t(TRADE_LABEL[profile.data.trade]) : t("Trade not added")} · +91 {profile.data.phone}
                </p>
              </div>
              {summary.data && (
                <div className="w-full sm:w-56">
                  <p className="mb-1 text-small text-ink-secondary">{t("Profile {n}% complete", { n: summary.data.profileStrength })}</p>
                  <ProgressBar value={summary.data.profileStrength} label="Profile strength" />
                  {summary.data.profileHint && <p className="mt-1 text-caption text-ink-muted">{t(summary.data.profileHint)}</p>}
                </div>
              )}
            </CardBody>
          </Card>
          <Tabs tabs={[{ value: "profile", label: t("Details") }, { value: "documents", label: t("Resume & documents") }]} value={tab} onChange={(v) => setSp({ tab: v }, { replace: true })} className="mb-6" />
          <div key={tab} className="animate-page">{tab === "profile" ? <ProfileDetails p={profile.data} /> : <Documents />}</div>
        </>
      )}
    </div>
  );
}

/** Shrinks the photo on the phone before upload, so it stays small on slow networks. */
function resizeImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("bad image"));
    img.src = URL.createObjectURL(file);
  });
}

function PhotoPicker({ profile }: { profile: WorkerProfile }) {
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (photoUrl: string | undefined) => workerApi.updateProfile({ photoUrl }),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: qk.worker.all }); toast.success(v ? "Photo added" : "Photo removed"); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const pick = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose a photo (JPG or PNG).");
    try { save.mutate(await resizeImage(f)); } catch { toast.error("Couldn't read this photo. Try another one."); }
  };
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <label className="group relative cursor-pointer" title="Change photo">
        <Avatar name={profile.name} size="lg" src={profile.photoUrl} className="h-16 w-16" />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow-md transition-transform group-hover:scale-105"><Camera className="h-3.5 w-3.5" aria-hidden /></span>
        <input type="file" accept="image/*" className="sr-only" aria-label={profile.photoUrl ? "Change profile photo" : "Add profile photo"} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {profile.photoUrl
        ? <button className="text-caption text-ink-muted hover:text-danger-fg" onClick={() => save.mutate(undefined)}>Remove</button>
        : <span className="text-caption font-medium text-primary">Add photo</span>}
    </div>
  );
}

/* ---------------- Details ---------------- */

type Section = "work" | "personal" | "preferences" | null;

function ProfileDetails({ p }: { p: WorkerProfile }) {
  const [sp, setSp] = useSearchParams();
  const fromLink = sp.get("edit") as Section;
  const [edit, setEditState] = useState<Section>(["work", "personal", "preferences"].includes(fromLink ?? "") ? fromLink : null);
  const setEdit = (s: Section) => {
    setEditState(s);
    if (!s && sp.get("edit")) { const n = new URLSearchParams(sp); n.delete("edit"); setSp(n, { replace: true }); }
  };
  const editBtn = (s: Section) => <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEdit(s)}>{t("Edit")}</Button>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={t("Work")} action={editBtn("work")} />
        <CardBody>
          <DefinitionList items={[
            [t("Trade"), p.trade ? t(TRADE_LABEL[p.trade]) : ""],
            [t("Experience"), p.experience ? t(EXPERIENCE_LABEL[p.experience]) : ""],
            [t("Education"), p.qualifications.join(", ")],
            [t("Licences / certificates"), p.licences.join(", ")],
            [t("Safety training"), p.safetyTrainingHours ? t("{n} hours", { n: p.safetyTrainingHours }) : ""],
            [t("Languages I speak"), (p.languages ?? []).join(", ")],
          ]} />
          <div className="mt-4">
            <p className="text-caption text-ink-muted">{t("Skills")}</p>
            {p.skills.length ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">{p.skills.map((s) => <li key={s} className="rounded-sm bg-surface-muted px-2 py-1 text-small text-ink">{s}</li>)}</ul>
            ) : <p className="text-body text-ink-muted">—</p>}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Personal")} action={editBtn("personal")} />
        <CardBody>
          <DefinitionList items={[
            [t("Name"), p.name],
            [t("Mobile"), `+91 ${p.phone}`],
            ["Email", p.email ?? ""],
            [t("Date of birth"), p.dob ? formatDate(p.dob) : ""],
            [t("Gender"), p.gender ? { male: "Male", female: "Female", other: "Other" }[p.gender] : ""],
            [t("City"), p.location ? `${p.location.city}${p.location.state ? `, ${p.location.state}` : ""}` : ""],
            [t("Address"), [p.address, p.pincode].filter(Boolean).join(" – ")],
            [t("About me"), p.about ?? ""],
          ]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("Job preferences")} action={editBtn("preferences")} />
        <CardBody>
          <DefinitionList items={[
            [t("Expected pay"), p.expectedPay ? `₹${formatNumber(p.expectedPay)} / ${t("month")}` : ""],
            [t("Shift"), p.shiftPreference ? t(SHIFT_LABEL[p.shiftPreference]) : ""],
            [t("Looking for"), p.employmentType ? t(EMPLOYMENT_TYPE_LABEL[p.employmentType]) : ""],
            [t("Ready to move"), p.willingToRelocate ? t("Yes") : t("No")],
            [t("When can you join"), t(AVAILABILITY_LABEL[p.availability])],
          ]} />
        </CardBody>
      </Card>
      {edit && <EditDrawer section={edit} profile={p} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditDrawer({ section, profile, onClose }: { section: Exclude<Section, null>; profile: WorkerProfile; onClose: () => void }) {
  const [d, setD] = useState<WorkerProfile>(profile);
  const [skill, setSkill] = useState("");
  const [error, setError] = useState<string>();
  const qc = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: () => workerApi.updateProfile(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.worker.all }); toast.success("Profile updated"); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = (key: "qualifications" | "licences" | "languages", v: string) => {
    const list = d[key] ?? [];
    setD({ ...d, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };
  const addSkill = () => {
    const s = skill.trim();
    if (s && !d.skills.includes(s)) setD({ ...d, skills: [...d.skills, s] });
    setSkill("");
  };
  const submit = () => {
    if (section === "personal" && d.name.trim().length < 2) return setError("Please enter your name.");
    if (section === "personal" && d.pincode && d.pincode.length !== 6) return toast.error("Pincode has 6 digits.");
    save.mutate();
  };

  const titles = { work: "Edit work", personal: "Edit personal details", preferences: "Edit job preferences" };
  return (
    <Drawer open onClose={onClose} title={titles[section]}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={save.isPending}>Save</Button></>}>
      <div className="space-y-5">
        {section === "work" && (
          <>
            <Field label="Trade">{(id) => (
              <Select id={id} value={d.trade ?? ""} onChange={(e) => setD({ ...d, trade: (e.target.value || undefined) as Trade })}>
                <option value="">Choose…</option>
                {(Object.keys(TRADE_LABEL) as Trade[]).map((t) => <option key={t} value={t}>{TRADE_LABEL[t]}</option>)}
              </Select>
            )}</Field>
            <Group label="Experience">
              {(Object.keys(EXPERIENCE_LABEL) as ExperienceBand[]).map((x) => <Chip key={x} selected={d.experience === x} onClick={() => setD({ ...d, experience: x })}>{EXPERIENCE_LABEL[x]}</Chip>)}
            </Group>
            <Group label="Education">
              {QUALIFICATIONS.map((q) => <Chip key={q} selected={d.qualifications.includes(q)} onClick={() => toggle("qualifications", q)}>{q}</Chip>)}
            </Group>
            <Group label="Licences / certificates">
              {LICENCES.map((q) => <Chip key={q} selected={d.licences.includes(q)} onClick={() => toggle("licences", q)}>{q}</Chip>)}
            </Group>
            <Field label="Safety training (hours)" hint="Total hours of safety training you have done, e.g. 40. Leave empty if none.">
              {(id, desc) => <Input id={id} aria-describedby={desc} inputMode="numeric" maxLength={4} value={d.safetyTrainingHours ?? ""} onChange={(e) => setD({ ...d, safetyTrainingHours: Number(e.target.value.replace(/\D/g, "")) || undefined })} className="w-32" />}
            </Field>
            <Group label="Languages I speak">
              {LANGUAGES.map((l) => <Chip key={l} selected={(d.languages ?? []).includes(l)} onClick={() => toggle("languages", l)}>{l}</Chip>)}
            </Group>
            <div>
              <p className="mb-1.5 text-small font-medium text-ink">Skills</p>
              <div className="flex gap-2">
                <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Gas cutting" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
                <Button variant="secondary" onClick={addSkill}>Add</Button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {d.skills.map((s) => (
                  <li key={s}><button onClick={() => setD({ ...d, skills: d.skills.filter((x) => x !== s) })} className="rounded-sm bg-surface-muted px-2 py-1 text-small text-ink hover:bg-danger-bg hover:text-danger-fg" aria-label={`Remove ${s}`}>{s} ✕</button></li>
                ))}
              </ul>
            </div>
          </>
        )}
        {section === "personal" && (
          <>
            <Field label="Name" error={error}>{(id, desc) => <Input id={id} aria-describedby={desc} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} invalid={!!error} />}</Field>
            <Field label="Mobile number" hint={<>New number? <Link to="/help?topic=Change%20my%20mobile%20number" className="font-medium text-primary hover:underline">Send us a request</Link> and we'll change it.</>}>{(id, desc) => <Input id={id} aria-describedby={desc} prefix="+91" value={d.phone} disabled />}</Field>
            <Field label="Email" hint="Optional">{(id, desc) => <Input id={id} aria-describedby={desc} type="email" value={d.email ?? ""} onChange={(e) => setD({ ...d, email: e.target.value || undefined })} />}</Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of birth">{(id) => <Input id={id} type="date" max={new Date(Date.now() - 18 * 365.25 * 86_400_000).toISOString().slice(0, 10)} value={d.dob?.slice(0, 10) ?? ""} onChange={(e) => setD({ ...d, dob: e.target.value || undefined })} />}</Field>
              <Field label="Gender">{(id) => (
                <Select id={id} value={d.gender ?? ""} onChange={(e) => setD({ ...d, gender: (e.target.value || undefined) as WorkerProfile["gender"] })}>
                  <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </Select>
              )}</Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">{(id) => <Input id={id} value={d.location?.city ?? ""} onChange={(e) => setD({ ...d, location: { city: e.target.value, state: d.location?.state ?? "" } })} />}</Field>
              <Field label="State">{(id) => <Input id={id} value={d.location?.state ?? ""} onChange={(e) => setD({ ...d, location: { city: d.location?.city ?? "", state: e.target.value } })} />}</Field>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="Address">{(id) => <Input id={id} value={d.address ?? ""} onChange={(e) => setD({ ...d, address: e.target.value || undefined })} />}</Field>
              <Field label="Pincode">{(id) => <Input id={id} inputMode="numeric" maxLength={6} value={d.pincode ?? ""} onChange={(e) => setD({ ...d, pincode: e.target.value.replace(/\D/g, "") || undefined })} />}</Field>
            </div>
            <Field label="About me" hint="1–2 lines about your work">{(id, desc) => <Textarea id={id} aria-describedby={desc} maxLength={300} value={d.about ?? ""} onChange={(e) => setD({ ...d, about: e.target.value })} />}</Field>
          </>
        )}
        {section === "preferences" && (
          <>
            <Field label="Expected pay per month">{(id) => <Input id={id} prefix="₹" inputMode="numeric" value={d.expectedPay ? formatNumber(d.expectedPay) : ""} onChange={(e) => setD({ ...d, expectedPay: Number(e.target.value.replace(/\D/g, "")) || undefined })} />}</Field>
            <Group label="Looking for">
              {(["permanent", "contract", "any"] as const).map((x) => <Chip key={x} selected={d.employmentType === x} onClick={() => setD({ ...d, employmentType: x })}>{EMPLOYMENT_TYPE_LABEL[x]}</Chip>)}
            </Group>
            <Group label="Shift">
              {(["any", "day", "night", "rotational"] as (Shift | "any")[]).map((s) => <Chip key={s} selected={d.shiftPreference === s} onClick={() => setD({ ...d, shiftPreference: s })}>{SHIFT_LABEL[s]}</Chip>)}
            </Group>
            <Group label="Ready to move to another city?">
              <Chip selected={d.willingToRelocate} onClick={() => setD({ ...d, willingToRelocate: true })}>Yes</Chip>
              <Chip selected={!d.willingToRelocate} onClick={() => setD({ ...d, willingToRelocate: false })}>No</Chip>
            </Group>
            <Group label="When can you join?">
              {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => <Chip key={a} selected={d.availability === a} onClick={() => setD({ ...d, availability: a })}>{AVAILABILITY_LABEL[a].replace("Can join ", "")}</Chip>)}
            </Group>
          </>
        )}
      </div>
    </Drawer>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-small font-medium text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/* ---------------- Documents ---------------- */

function Documents() {
  const q = useQuery({ queryKey: qk.worker.documents, queryFn: workerApi.documents });
  const [type, setType] = useState<DocType>("resume");
  const [progress, setProgress] = useState<number>();
  const [toDelete, setToDelete] = useState<WorkerDocument | null>(null);
  const [preview, setPreview] = useState<WorkerDocument | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.worker.all });

  const upload = useMutation({
    mutationFn: (f: File) => workerApi.uploadDocument(f, type, setProgress),
    onSuccess: () => { refresh(); toast.success("Uploaded. Employers you apply to can now see it."); },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => setProgress(undefined),
  });
  const remove = useMutation({
    mutationFn: (id: string) => workerApi.deleteDocument(id),
    onSuccess: () => { setToDelete(null); refresh(); toast.success("Document deleted"); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const makeDefault = useMutation({ mutationFn: workerApi.setDefaultResume, onSuccess: () => { refresh(); toast.success("Default resume changed"); } });

  const docs = q.data ?? [];
  const hasResume = docs.some((d) => d.type === "resume");
  const onlyResume = toDelete?.type === "resume" && docs.filter((d) => d.type === "resume").length === 1;

  return (
    <div className="space-y-6">
      {!q.isLoading && !hasResume && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="text-body font-semibold text-ink">Add your resume</p>
            <p className="text-small text-ink-secondary">Employers shortlist people with a resume much faster. A clear photo of a printed resume is fine too.</p>
          </div>
        </div>
      )}
      <Card>
        <CardHeader title="Add a document" description="Resume, ID or certificates. A clear photo is fine. Employers you apply to can see these." />
        <CardBody className="space-y-4">
          <Field label="Document type">{(id) => (
            <Select id={id} value={type} onChange={(e) => setType(e.target.value as DocType)}>
              {(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((t) => <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>)}
            </Select>
          )}</Field>
          <FileUpload onFile={(f) => upload.mutate(f)} uploading={upload.isPending} progress={progress} />
          {type === "id_proof" && <p className="text-small text-ink-muted">Tip: you can cover the first 8 digits of your Aadhaar. We only need the last 4.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="My documents" description={`${docs.length} file${docs.length === 1 ? "" : "s"}`} />
        {q.isLoading ? <CardBody><ListSkeleton count={2} lines={1} /></CardBody> : q.isError ? <CardBody><ErrorState onRetry={() => q.refetch()} /></CardBody> : docs.length === 0 ? (
          <CardBody><p className="py-6 text-center text-body text-ink-muted">No documents yet. Add your ID and certificates to get verified faster.</p></CardBody>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    {d.mimeType.startsWith("image/") ? <FileImage className="h-5 w-5" aria-hidden /> : <FileText className="h-5 w-5" aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-ink" title={d.name}>{d.name}</p>
                    <p className="text-small text-ink-muted">{DOC_TYPE_LABEL[d.type]} · {formatBytes(d.sizeBytes)} · {formatDate(d.uploadedAt)}</p>
                    {d.isDefaultResume && <div className="mt-1"><Badge tone="info" icon={<Star className="h-3 w-3" aria-hidden />}>Default resume</Badge></div>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  {d.type === "resume" && !d.isDefaultResume && <Button variant="ghost" size="sm" onClick={() => makeDefault.mutate(d.id)}>Set as default</Button>}
                  <IconButton label="Preview" onClick={() => setPreview(d)}><Eye className="h-4 w-4" /></IconButton>
                  <IconButton label="Delete" onClick={() => setToDelete(d)} className="hover:bg-danger-bg hover:text-danger-fg"><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {preview && <Drawer open onClose={() => setPreview(null)} title={preview.name} subtitle={DOC_TYPE_LABEL[preview.type]} width="max-w-[640px]"><DocumentPreview doc={preview} tall /></Drawer>}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete.id)} loading={remove.isPending}
        title="Delete this document?" confirmLabel="Delete"
        message={onlyResume ? "This is your only resume. Employers you already applied to keep the copy you sent. Future applications will use your profile." : "You can upload it again later."} />
    </div>
  );
}
