import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Illustration } from "./Illustration";
import type { ArtName } from "./illustrations";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-md bg-surface-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/[.06] before:to-transparent", className)} aria-hidden />;
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

/**
 * Shown when a list or page has nothing yet: a drawing, a short title, and what to do next.
 * `compact` is for small spaces inside a card or menu.
 */
export function EmptyState({ art = "search", title, description, action, compact, className }: { art?: ArtName; title: string; description?: string; action?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-6" : "rounded-lg border border-border bg-surface px-6 py-10", className)}>
      <Illustration name={art} className={cn("w-auto", compact ? "mb-2 h-16" : "mb-4 h-28")} />
      <h3 className={compact ? "text-body font-semibold text-ink" : "text-h3 text-ink"}>{title}</h3>
      {description && <p className={cn("mt-1 text-ink-muted", compact ? "max-w-xs text-small" : "max-w-sm text-body")}>{description}</p>}
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
