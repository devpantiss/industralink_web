/** The thin line with a word in the middle, e.g. between the Google button and the form. */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-small font-medium text-ink-muted">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
