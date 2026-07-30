"use client";

import { ImagePlus, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ACCEPTED_IMAGE_TYPES, uploadPublicImage } from "@/lib/storage";

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

/**
 * Single-image upload field. Uploads directly to storage and returns the
 * public URL via `onChange`. A "paste a URL instead" fallback keeps existing
 * URL-based values editable.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, folder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="group relative w-full overflow-hidden rounded-xl border border-black/[0.08]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded preview"
            className="h-40 w-full object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-[#171a16] shadow-sm backdrop-blur hover:bg-white disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm backdrop-blur hover:bg-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#fbfaf7] px-4 py-8 text-center transition-colors hover:border-black/30 hover:bg-[#f6f5f1] disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#6b7068]" />
          ) : (
            <ImagePlus className="h-6 w-6 text-[#6b7068]" />
          )}
          <span className="text-sm font-semibold text-[#171a16]">
            {uploading ? "Uploading…" : "Upload a photo"}
          </span>
          <span className="text-xs text-[#6b7068]">
            JPG, PNG, WebP or GIF · up to 10 MB
          </span>
        </button>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowUrl((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6b7068] hover:text-[#171a16]"
        >
          <Link2 className="h-3.5 w-3.5" />
          {showUrl ? "Hide URL field" : "Paste a URL instead"}
        </button>
      </div>

      {showUrl && (
        <Input
          placeholder="https://example.com/photo.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs"
        />
      )}

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Multi-image uploader for galleries. Renders a grid of thumbnails (each
 * removable) plus an upload tile that accepts multiple files at once. A
 * "paste a URL" fallback keeps existing URL entries editable.
 */
export function ImageGalleryUpload({
  values,
  onChange,
  folder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");

  const photos = values.filter((v) => v.trim());

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(fileList)) {
        uploaded.push(await uploadPublicImage(file, folder));
      }
      onChange([...photos, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      if (uploaded.length) onChange([...photos, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange([...photos, url]);
    setUrlDraft("");
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-black/[0.08]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={`Gallery photo ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Remove photo"
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/15 bg-[#fbfaf7] text-center transition-colors hover:border-black/30 hover:bg-[#f6f5f1] disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#6b7068]" />
          ) : (
            <ImagePlus className="h-5 w-5 text-[#6b7068]" />
          )}
          <span className="px-2 text-xs font-semibold text-[#171a16]">
            {uploading ? "Uploading…" : "Add photos"}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="…or paste a photo URL"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          className="h-10 flex-1 text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={addUrl}>
          Add
        </Button>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
