import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-md bg-surface-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent", className)} aria-hidden />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-1/2" />
      {[...Array(lines)].map((_, i) => <Skeleton key={i} className={cn("mt-3 h-4", i % 2 ? "w-2/3" : "w-5/6")} />)}
    </div>
  );
}

export function ListSkeleton({ count = 3, lines = 3 }: { count?: number; lines?: number }) {
  return <div className="flex flex-col gap-4">{[...Array(count)].map((_, i) => <CardSkeleton key={i} lines={lines} />)}</div>;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">{icon ?? <Inbox className="h-6 w-6" aria-hidden />}</div>
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-body text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-lg border border-danger-fg/20 bg-danger-bg px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-danger-fg" aria-hidden />
      <p className="text-body text-ink">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Renders loading / error / empty / data in one consistent way. */
export function QueryState<T>({ query, empty, skeleton, children }: {
  query: { isLoading: boolean; isError: boolean; data: T | undefined; refetch: () => unknown; error?: unknown };
  empty?: (data: T) => ReactNode | false;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <>{skeleton ?? <ListSkeleton />}</>;
  if (query.isError || query.data === undefined) return <ErrorState message="We couldn't load this. Please try again." onRetry={() => query.refetch()} />;
  const e = empty?.(query.data);
  if (e) return <>{e}</>;
  return <>{children(query.data)}</>;
}
