import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, MapPin, Search, Send, ShieldCheck, UserSearch } from "lucide-react";
import type { ExperienceBand, TalentProfile, Trade } from "@/types";
import { talentApi } from "@/api/extra";
import { employerApi } from "@/api/employer";
import { qk } from "@/api/keys";
import { errorCode, errorMessage } from "@/api/client";
import { AVAILABILITY_LABEL, EXPERIENCE_LABEL, TRADE_LABEL } from "@/lib/labels";
import { formatNumber } from "@/lib/format";
import { Avatar, Banner, PageHeader } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

/**
 * Search workers who said "let companies find me" (like Naukri Resdex, but
 * simpler). HR sees work details only; phone, email and documents appear
 * once the worker applies. "Invite to apply" sends the worker a job link.
 */
export default function FindWorkers() {
  const [q, setQ] = useState("");
  const [trade, setTrade] = useState<Trade | "">("");
  const [experience, setExperience] = useState<ExperienceBand | "">("");
  const [city, setCity] = useState("");
  const [relocate, setRelocate] = useState(true);
  const params = { q: q.trim() || undefined, trade, experience, city: city.trim() || undefined, relocate: city.trim() ? relocate : undefined };
  const list = useQuery({ queryKey: qk.employer.talent(params), queryFn: () => talentApi.search(params), retry: (n, e) => !["NOT_VERIFIED", "DISABLED"].includes(errorCode(e) ?? "") && n < 2 });
  const [inviting, setInviting] = useState<TalentProfile | null>(null);
  const blocked = list.isError && ["NOT_VERIFIED", "DISABLED"].includes(errorCode(list.error) ?? "");

  return (
    <div>
      <PageHeader title="Find workers" description="Search workers who want to be found, and invite them to apply." />
      <div className="mb-4 grid gap-2 rounded-lg border border-border bg-surface p-3 shadow-xs md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Skill, licence or name</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Skill, licence or name (e.g. MIG, DGMS)" className="pl-9" />
        </label>
        <Select aria-label="Trade" value={trade} onChange={(e) => setTrade(e.target.value as Trade)}>
          <option value="">Any trade</option>
          {(Object.keys(TRADE_LABEL) as Trade[]).map((x) => <option key={x} value={x}>{TRADE_LABEL[x]}</option>)}
        </Select>
        <Select aria-label="Experience" value={experience} onChange={(e) => setExperience(e.target.value as ExperienceBand)}>
          <option value="">Any experience</option>
          {(Object.keys(EXPERIENCE_LABEL) as ExperienceBand[]).map((x) => <option key={x} value={x}>{EXPERIENCE_LABEL[x]}</option>)}
        </Select>
        <label className="relative">
          <span className="sr-only">City or state</span>
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or state" className="pl-9" />
        </label>
        {city.trim() && <div className="md:col-span-4"><Checkbox label="Also show workers ready to move here" checked={relocate} onChange={setRelocate} /></div>}
      </div>

      <p className="mb-3 flex items-center gap-2 text-small text-ink-muted"><EyeOff className="h-4 w-4" aria-hidden /> Phone numbers and documents stay hidden until a worker applies to your job.</p>

      {list.isLoading ? <ListSkeleton count={3} /> : blocked ? (
        <Banner tone="warning" icon={<ShieldCheck className="h-5 w-5" />}>{errorMessage(list.error)}</Banner>
      ) : list.isError ? <ErrorState onRetry={() => list.refetch()} /> : list.data!.length === 0 ? (
        <EmptyState icon={<UserSearch className="h-6 w-6" />} title="No workers match" description="Try fewer filters, or search a nearby city." />
      ) : (
        <>
          <p className="mb-2 text-small text-ink-secondary">{list.data!.length} worker{list.data!.length === 1 ? "" : "s"}</p>
          <ul className="stagger grid gap-3 lg:grid-cols-2">
            {list.data!.map((w) => <WorkerCard key={w.userId} w={w} onInvite={() => setInviting(w)} />)}
          </ul>
        </>
      )}
      {inviting && <InviteDialog worker={inviting} onClose={() => setInviting(null)} />}
    </div>
  );
}

function WorkerCard({ w, onInvite }: { w: TalentProfile; onInvite: () => void }) {
  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface p-4 shadow-xs">
      <div className="flex gap-3">
        <Avatar name={w.name} src={w.photoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-h3 text-ink">{w.name}</p>
          <p className="text-small text-ink-secondary">{w.trade ? TRADE_LABEL[w.trade] : "Trade not given"} · {w.experience ? EXPERIENCE_LABEL[w.experience] : "—"}</p>
          <p className="flex items-center gap-1 text-small text-ink-muted"><MapPin className="h-3.5 w-3.5" aria-hidden />{w.location ? `${w.location.city}, ${w.location.state}` : "—"}{w.willingToRelocate && " · ready to move"}</p>
        </div>
        {w.expectedPay ? <p className="shrink-0 text-right text-small text-ink-secondary"><span className="block font-semibold text-ink">₹{formatNumber(w.expectedPay)}</span>expects / month</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[...w.qualifications, ...w.licences].map((x) => <Badge key={x} tone="success">{x}</Badge>)}
        {w.safetyTrainingHours ? <Badge tone="info">{w.safetyTrainingHours} h safety training</Badge> : null}
      </div>
      {w.skills.length > 0 && <p className="mt-2 line-clamp-2 text-small text-ink-secondary">{w.skills.join(" · ")}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <span className="text-caption text-ink-muted">{AVAILABILITY_LABEL[w.availability]}{w.languages?.length ? ` · speaks ${w.languages.join(", ")}` : ""}</span>
        <div className="flex items-center gap-2">
          {w.appliedTo.length > 0 && <Badge tone="success" icon={<CheckCircle2 className="h-3 w-3" />}>Already applied</Badge>}
          {w.invitedTo.length > 0 && <Badge tone="neutral">Invited to {w.invitedTo.length}</Badge>}
          <Button size="sm" variant={w.appliedTo.length ? "secondary" : "primary"} icon={<Send className="h-4 w-4" />} onClick={onInvite}>{w.appliedTo.length ? "Invite to another job" : "Invite to apply"}</Button>
        </div>
      </div>
    </li>
  );
}

function InviteDialog({ worker, onClose }: { worker: TalentProfile; onClose: () => void }) {
  const jobs = useQuery({ queryKey: qk.employer.jobs("active"), queryFn: () => employerApi.jobs("active") });
  const options = (jobs.data ?? []).filter((j) => !worker.appliedTo.includes(j.id) && !worker.invitedTo.includes(j.id));
  const [jobId, setJobId] = useState("");
  const chosen = jobId || options.find((j) => j.trade === worker.trade)?.id || options[0]?.id || "";
  const qc = useQueryClient();
  const toast = useToast();
  const invite = useMutation({
    mutationFn: () => talentApi.invite(worker.userId, chosen),
    onSuccess: () => { toast.success(`${worker.name} was sent the job. They'll see it in their notifications.`); qc.invalidateQueries({ queryKey: ["employer", "talent"] }); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} title={`Invite ${worker.name} to apply`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={invite.isPending} disabled={!chosen} onClick={() => invite.mutate()}>Send invite</Button></>}>
      {jobs.isLoading ? <ListSkeleton count={1} /> : options.length === 0 ? (
        <p>No open jobs to invite them to. They may have applied or been invited to all of them already.</p>
      ) : (
        <>
          <p>They get a notification with a link to the job. If they're interested, they apply like anyone else.</p>
          <label className="mt-4 block text-small font-medium text-ink" htmlFor="invite-job">Which job?</label>
          <Select id="invite-job" className="mt-1.5" value={chosen} onChange={(e) => setJobId(e.target.value)}>
            {options.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.location.city}</option>)}
          </Select>
        </>
      )}
    </Modal>
  );
}
