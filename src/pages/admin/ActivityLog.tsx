import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { adminApi } from "@/api/admin";
import { qk } from "@/api/keys";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/Misc";
import { EmptyState, QueryState } from "@/components/ui/States";

export default function ActivityLog() {
  const q = useQuery({ queryKey: qk.admin.audit, queryFn: adminApi.audit });
  return (
    <div>
      <PageHeader title="Activity log" description="Every admin action, newest first. This list can't be edited." />
      <QueryState query={q} empty={(d) => d.length === 0 && <EmptyState icon={<ScrollText className="h-6 w-6" />} title="No activity yet" />}>
        {(rows) => (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 border-b border-border px-5 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-40 shrink-0 text-small text-ink-muted tabular">{formatDateTime(r.at)}</span>
                <span className="text-body"><span className="font-medium text-ink">{r.actor}</span> <span className="text-ink-secondary">{r.action.toLowerCase()}</span> <span className="font-medium text-ink">{r.target}</span></span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
