"use client";
import * as React from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function cropAndCompress(file: File, aspect: number) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error("Choose a JPG, PNG or WebP image smaller than 12 MB.");
  const bitmap = await createImageBitmap(file);
  const sourceAspect = bitmap.width / bitmap.height;
  let sx = 0,
    sy = 0,
    sw = bitmap.width,
    sh = bitmap.height;
  if (sourceAspect > aspect) {
    sw = bitmap.height * aspect;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / aspect;
    sy = (bitmap.height - sh) / 2;
  }
  const width = aspect === 1 ? 800 : 1600;
  const height = Math.round(width / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();
  return await new Promise<File>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], "profile.webp", { type: "image/webp" }))
          : reject(new Error("Could not process image.")),
      "image/webp",
      0.82,
    ),
  );
}
export function ImageUploader({
  label,
  value,
  kind,
  aspect = 1,
  onChange,
}: {
  label: string;
  value: string | null;
  kind: string;
  aspect?: number;
  onChange: (url: string | null) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(value);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => setPreview(value), [value]);
  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError("");
    try {
      const processed = await cropAndCompress(selected, aspect);
      setFile(processed);
      setPreview(URL.createObjectURL(processed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid image.");
    }
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      const response = await fetch("/api/freelancer/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onChange(data.url);
      setPreview(data.url);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (value)
      await fetch(`/api/freelancer/upload?url=${encodeURIComponent(value)}`, {
        method: "DELETE",
      });
    setFile(null);
    setPreview(null);
    onChange(null);
  };
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div
        className={`relative overflow-hidden border bg-muted ${aspect === 1 ? "h-32 w-32 rounded-full" : "aspect-[3/1] w-full rounded-xl"}`}
      >
        {preview ? (
          <img
            src={preview}
            alt={`${label} preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="cursor-pointer">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={choose}
          />
          <span className="inline-flex h-9 items-center rounded-md border px-3 text-sm">
            {preview ? "Replace" : "Choose image"}
          </span>
        </label>
        {file && (
          <Button type="button" size="sm" onClick={upload} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload cropped image
          </Button>
        )}
        {preview && (
          <Button type="button" size="sm" variant="ghost" onClick={remove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Previewed, center-cropped and compressed before upload.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
