import { cn } from "@/lib/cn";

/** Brand mark: a cobalt tile with a white "L" (the link between worker and site) and a safety-yellow block. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="rgb(var(--primary))" />
      <path d="M9 8h4.2v12.2H23V24H9z" fill="#fff" />
      <rect x="17" y="8" width="6" height="6" rx="1.2" fill="rgb(var(--accent))" />
    </svg>
  );
}
