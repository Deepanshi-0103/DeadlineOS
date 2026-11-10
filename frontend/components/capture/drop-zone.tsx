"use client";

import { useState } from "react";
import { UploadCloud, FileText, ImageIcon, Check, Loader2, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onCaptured?: () => void;
}

function detectUploadType(file: File): "pdf" | "text" | "image" {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp)$/i.test(name)
  ) {
    return "image";
  }
  return "text";
}

export function DropZone({ onCaptured }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [wasImage, setWasImage] = useState(false);

  const upload = async (file: File) => {
    const kind = detectUploadType(file);
    setFileName(file.name);
    setWasImage(kind === "image");
    setLoading(true);
    setError(null);
    setDone(false);
    setNote(null);

    try {
      const form = new FormData();
      form.append("type", kind);
      form.append("file", file);

      const res = await fetch("/api/capture", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok || data.job?.status === "failed") {
        throw new Error(data.error || data.job?.error || "Upload capture failed");
      }

      setDone(true);
      const opp = data.opportunity;
      const bits: string[] = [];
      if (kind === "image") {
        bits.push(
          opp?.needsReview
            ? `Saved “${opp.title}” from image — please verify the deadline.`
            : `Extracted “${opp?.title ?? "opportunity"}” from image into your board.`
        );
        if (data.llmUsed) bits.push("AI vision applied.");
        else if (data.llmError) bits.push(`AI: ${data.llmError}.`);
      } else {
        bits.push(
          opp?.needsReview
            ? `Saved “${opp.title}” from file — please verify the deadline.`
            : `Extracted “${opp?.title ?? "opportunity"}” from ${file.name}.`
        );
      }
      setNote(bits.join(" "));
      onCaptured?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !loading) upload(file);
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? "border-brand bg-brand/5"
            : "border-line-soft bg-base hover:border-brand/40"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,text/plain,image/png,image/jpeg,image/webp"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        <label htmlFor="file-upload" className={`block ${loading ? "pointer-events-none" : "cursor-pointer"}`}>
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-brand text-sm font-medium">
              <Loader2 size={22} className="animate-spin" />
              {wasImage ? "Reading image with AI…" : "Reading document…"}
            </div>
          ) : done && fileName ? (
            <div className="flex items-center justify-center gap-2 text-brand font-semibold text-sm">
              {wasImage ? <ImageIcon size={20} /> : <FileText size={20} />}
              <span>{fileName}</span>
              <Check size={16} className="text-safe" />
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center mx-auto mb-2">
                <UploadCloud size={20} />
              </div>
              <p className="text-sm font-medium text-ink">
                Drag & drop PDF, image, or TXT — or{" "}
                <span className="text-brand underline">browse</span>
              </p>
              <p className="text-xs text-ink-muted mt-1">
                PNG / JPG / WEBP up to 8MB · AI extracts event + deadline into your board
              </p>
            </div>
          )}
        </label>
      </div>
      {note && (
        <p className="text-xs text-brand mt-2 font-medium flex items-start gap-1.5">
          <Check size={14} className="mt-0.5 shrink-0" />
          {note}
        </p>
      )}
      {error && (
        <p className="text-xs text-critical mt-2 font-medium flex items-start gap-1.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
