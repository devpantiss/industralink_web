import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { ProgressBar } from "./Misc";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX = 5 * 1024 * 1024;

/** Checks type and size in the browser first, so users get instant feedback. */
export function validateFile(file: File): string | null {
  if (!ACCEPT.split(",").includes(file.type)) return "Please upload a photo (JPG/PNG) or a PDF.";
  if (file.size > MAX) return "File is too big. Max size is 5 MB.";
  return null;
}

export function FileUpload({ onFile, uploading, progress, disabled }: { onFile: (f: File) => void; uploading?: boolean; progress?: number; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const err = validateFile(f);
    setError(err);
    if (!err) onFile(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
        className={cn("flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          drag ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-muted/50")}
      >
        <Upload className="mb-2 h-6 w-6 text-primary" aria-hidden />
        <p className="text-body font-medium text-ink"><span className="hidden sm:inline">Drag your file here, or use a button below</span><span className="sm:hidden">Add a photo or file</span></p>
        <p className="mt-1 text-small text-ink-muted">PDF, JPG or PNG · max 5 MB</p>
        {uploading ? (
          <div className="mt-4 w-full max-w-xs">
            <ProgressBar value={progress ?? 30} tone="primary" label="Upload progress" />
            <p className="mt-2 text-small text-ink-muted">Uploading… {progress ? `${progress}%` : ""}</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" icon={<Camera className="h-4 w-4" />} onClick={() => cameraRef.current?.click()} disabled={disabled}>Take photo</Button>
            <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()} disabled={disabled}>Choose file</Button>
          </div>
        )}
        <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { handle(e.target.files); e.target.value = ""; }} />
      </div>
      {error && <p role="alert" className="mt-2 text-small text-danger-fg">{error}</p>}
    </div>
  );
}
