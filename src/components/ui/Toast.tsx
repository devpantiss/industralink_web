import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ToastItem { id: number; message: string; tone: "success" | "error"; action?: { label: string; onClick: () => void } }
interface ToastApi {
  success: (message: string, action?: ToastItem["action"]) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = ++seq;
    setItems((l) => [...l.slice(-2), { ...t, id }]);
    setTimeout(() => remove(id), t.action ? 6000 : 4000);
  }, [remove]);
  const api: ToastApi = {
    success: (message, action) => push({ message, tone: "success", action }),
    error: (message) => push({ message, tone: "error" }),
  };
  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
        {items.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-body text-ink shadow-md">
            {t.tone === "success" ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-bg text-success-fg"><CheckCircle2 className="h-4 w-4" aria-hidden /></span> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger-fg"><AlertCircle className="h-4 w-4" aria-hidden /></span>}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button className="rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary-soft" onClick={() => { t.action!.onClick(); remove(t.id); }}>{t.action.label}</button>
            )}
            <button aria-label="Dismiss" onClick={() => remove(t.id)} className={cn("text-ink-muted hover:text-ink")}><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
