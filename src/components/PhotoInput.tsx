"use client";

import { useState } from "react";
import { uploadPhoto } from "@/lib/photo";
import { thumb } from "@/lib/format";

export type Photo = { url: string; publicId: string } | null;

export function PhotoInput({ label, value, onChange }: { label: string; value: Photo; onChange: (p: Photo) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      {value && (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(value.url)} alt="" className="h-24 w-24 rounded-lg object-cover" />
          <button type="button" className="btn-light" onClick={() => onChange(null)}>
            Remove
          </button>
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        disabled={busy}
        onChange={(e) => pick(e.target.files?.[0])}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2"
      />
      {busy && <p className="mt-1 text-sm text-slate-500">Uploading…</p>}
      {error && <p className="error mt-1">{error}</p>}
    </div>
  );
}
