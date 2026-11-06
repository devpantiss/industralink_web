import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-md border border-border bg-surface px-3 text-ink placeholder:text-ink-muted transition-colors hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-muted disabled:text-ink-muted";

interface FieldProps {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: (id: string, describedBy?: string) => ReactNode;
  className?: string;
}

/** Label above, control, then hint or error below (plan section 4). */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-small font-medium text-ink">
          {label} {required && <span className="text-danger-fg" aria-hidden>*</span>}
        </label>
      )}
      {children(id, hint || error ? msgId : undefined)}
      {error ? (
        <p id={msgId} role="alert" className="flex items-center gap-1 text-small text-danger-fg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-small text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: string; inputSize?: "md" | "lg" };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, prefix, inputSize = "md", ...rest }, ref) {
  const h = inputSize === "lg" ? "h-12 text-body-lg" : "h-10 text-body";
  if (prefix) {
    return (
      <div className={cn("flex items-stretch", className)}>
        <span className={cn("flex items-center rounded-l-md border border-r-0 border-border bg-surface-muted px-3 text-ink-secondary", h)}>{prefix}</span>
        <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, h, "rounded-l-none", invalid && "border-danger-fg")} {...rest} />
      </div>
    );
  }
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(control, h, invalid && "border-danger-fg", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={cn(control, "h-10 pr-8", invalid && "border-danger-fg", className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(control, "min-h-[88px] py-2", invalid && "border-danger-fg", className)} {...rest} />;
});

/** Tap-friendly toggle chip, used for filters and multi-select options. */
export function Chip({ selected, onClick, children, icon, className }: { selected?: boolean; onClick?: () => void; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-small font-medium transition-colors",
        selected ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-ink-secondary hover:border-border-strong hover:text-ink",
        className,
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function Checkbox({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border-strong text-primary accent-[rgb(var(--primary))]" />
      <span>
        <span className="text-body text-ink">{label}</span>
        {hint && <span className="block text-small text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}
