import { Moon, Sun } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { setThemeChoice, useTheme } from "@/lib/theme";

/** Round moon/sun button for the top bars. "Follow my device" lives in Settings. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";
  const label = dark ? t("Switch to light mode") : t("Switch to dark mode");
  return (
    <button type="button" onClick={() => setThemeChoice(dark ? "light" : "dark")} aria-label={label} title={label}
      className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink", className)}>
      {dark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
