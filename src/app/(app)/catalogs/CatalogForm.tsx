"use client";

import { useState, useTransition } from "react";
import { PhotoInput, type Photo } from "@/components/PhotoInput";
import { CATALOG_TYPE_LABEL, CATALOG_TYPES, SIZE_LABEL, SIZES, sizeTotal } from "@/lib/validation";
import { saveCatalog } from "./actions";

type Size = (typeof SIZES)[number];
export type CatalogInput = {
  id?: string;
  name: string;
  volume: string;
  code: string;
  fabric: string;
  type: (typeof CATALOG_TYPES)[number];
  piecesPerDesign: string;
  designs: { id?: string; colourName: string }[];
  sizes: Record<Size, string>;
  photo: Photo;
};

const blank: CatalogInput = {
  name: "",
  volume: "",
  code: "",
  fabric: "",
  type: "SINGLE",
  piecesPerDesign: "",
  designs: [{ colourName: "" }],
  sizes: Object.fromEntries(SIZES.map((s) => [s, ""])) as Record<Size, string>,
  photo: null,
};

export function CatalogForm({ initial = blank }: { initial?: CatalogInput }) {
  const [f, setF] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof CatalogInput>(k: K, v: CatalogInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const perDesign = Number(f.piecesPerDesign) || 0;
  const sizes = Object.fromEntries(SIZES.map((s) => [s, Number(f.sizes[s]) || 0]));
  const ratioSum = sizeTotal(sizes);

  function setDesignCount(n: number) {
    n = Math.max(1, Math.min(200, n || 1));
    set("designs", Array.from({ length: n }, (_, i) => f.designs[i] ?? { colourName: "" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await saveCatalog(initial.id ?? null, {
        ...f,
        sizes,
        photoUrl: f.photo?.url ?? null,
        photoPublicId: f.photo?.publicId ?? null,
      });
      if (res?.error) setError(res.error);
    });
  }

  const text = (k: "name" | "volume" | "code" | "fabric", label: string, required = false) => (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input className="input" value={f[k]} required={required} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <form onSubmit={submit} className="card space-y-4">
      {text("name", "Catalogue name", true)}
      <div className="grid grid-cols-2 gap-3">
        {text("volume", "Volume")}
        {text("code", "Code")}
      </div>
      {text("fabric", "Fabric")}

      <div>
        <span className="label">Type</span>
        <div className="grid grid-cols-3 gap-2">
          {CATALOG_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => set("type", t)}
              className={f.type === t ? "btn-primary" : "btn-light"}
            >
              {CATALOG_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Number of designs</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={f.designs.length}
            onChange={(e) => setDesignCount(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="label">
            Pieces per design<span className="text-red-600"> *</span>
          </span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            required
            value={f.piecesPerDesign}
            onChange={(e) => set("piecesPerDesign", e.target.value)}
          />
        </label>
      </div>
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
        Total: {f.designs.length} × {perDesign.toLocaleString("en-IN")} ={" "}
        <b>{(f.designs.length * perDesign).toLocaleString("en-IN")} pcs</b>
      </p>

      <div>
        <span className="label">Design colours</span>
        <div className="grid grid-cols-2 gap-2">
          {f.designs.map((d, i) => (
            <input
              key={d.id ?? i}
              className="input"
              placeholder={`Design ${i + 1}, e.g. Green`}
              required
              value={d.colourName}
              onChange={(e) =>
                set("designs", f.designs.map((x, j) => (j === i ? { ...x, colourName: e.target.value } : x)))
              }
            />
          ))}
        </div>
      </div>

      <div>
        <span className="label">Size ratio (per design)</span>
        <div className="grid grid-cols-4 gap-2">
          {SIZES.map((s) => (
            <label key={s} className="block text-center">
              <span className="text-xs text-slate-500">{SIZE_LABEL[s]}</span>
              <input
                className="input px-1 text-center"
                type="number"
                inputMode="numeric"
                min={0}
                value={f.sizes[s]}
                onChange={(e) => set("sizes", { ...f.sizes, [s]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <p className={`mt-1 text-sm ${ratioSum === perDesign ? "text-green-700" : "text-amber-700"}`}>
          Sizes add up to {ratioSum} of {perDesign}
        </p>
      </div>

      <PhotoInput label="Catalogue photo" value={f.photo} onChange={(p) => set("photo", p)} />

      {error && <p className="error">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save catalogue"}
      </button>
    </form>
  );
}
