import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "./Button";

/* Page scroll lock shared by all open overlays. A count (not "remember the old value")
   so a dialog opened on top of a drawer can't leave the page stuck without scroll. */
let lockCount = 0;
const stack: symbol[] = [];

function useEscapeAndLock(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = Symbol();
    stack.push(id);
    // Escape closes only the top-most overlay.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stack[stack.length - 1] === id && closeRef.current();
    document.addEventListener("keydown", onKey);
    if (lockCount++ === 0) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      if (--lockCount === 0) document.body.style.overflow = "";
    };
  }, [open]);
}

function useAutoFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  return ref;
}

/** Side panel: 480px on desktop, full screen on mobile. */
export function Drawer({ open, onClose, title, subtitle, footer, children, width = "max-w-[480px]" }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; footer?: ReactNode; children: ReactNode; width?: string;
}) {
  useEscapeAndLock(open, onClose);
  const ref = useAutoFocus(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="glass-scrim animate-fade absolute inset-0" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
        className={cn("glass-thick animate-drawer absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden outline-none focus-visible:ring-0 sm:inset-y-2 sm:right-2 sm:rounded-2xl sm:border sm:border-white/60", width)}>
        <div className="flex items-start justify-between gap-3 border-b border-ink/5 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-h2 text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-small text-ink-muted">{subtitle}</div>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/5 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children?: ReactNode; footer?: ReactNode }) {
  useEscapeAndLock(open, onClose);
  const ref = useAutoFocus(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="glass-scrim animate-fade absolute inset-0" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="glass-thick animate-pop relative w-full max-w-[440px] rounded-2xl border border-white/60 p-6 outline-none focus-visible:ring-0">
        <h2 className="text-h2 text-ink">{title}</h2>
        {children && <div className="mt-2 text-body text-ink-secondary">{children}</div>}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmation for destructive actions: question title + consequence + red button. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, loading, tone = "danger", children }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message?: ReactNode; confirmLabel: string; loading?: boolean; tone?: "danger" | "primary"; children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      {message}
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  );
}
