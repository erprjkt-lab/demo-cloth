"use client";

import { useRef, useState, useTransition } from "react";
import { PhotoInput, type Photo } from "@/components/PhotoInput";
import { today } from "@/lib/format";
import { MAX_LUMPS_PER_LINE, PART_LABEL, PARTS, sumMeters } from "@/lib/validation";
import { createChallan } from "./actions";

type Catalog = { id: string; name: string; volume: string | null; fabric: string | null; designs: { id: string; colourName: string }[] };
type Line = { key: number; designId: string; partType: (typeof PARTS)[number]; lumps: string[] };

export function ChallanForm({ jobbers, catalogs }: { jobbers: { id: string; name: string }[]; catalogs: Catalog[] }) {
  const nextKey = useRef(1);
  const newLine = (): Line => ({ key: nextKey.current++, designId: "", partType: "TOP", lumps: [""] });

  const [date, setDate] = useState(today);
  const [jobberId, setJobberId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [fabricDetail, setFabricDetail] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState<Photo>(null);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const catalog = catalogs.find((c) => c.id === catalogId);
  const grandTotal = sumMeters(lines.flatMap((l) => l.lumps));

  function pickCatalog(id: string) {
    const prev = catalog?.fabric ?? "";
    const next = catalogs.find((c) => c.id === id);
    setCatalogId(id);
    if (!fabricDetail || fabricDetail === prev) setFabricDetail(next?.fabric ?? "");
    setLines((ls) => ls.map((l) => ({ ...l, designId: "" })));
  }

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function addLump(l: Line) {
    if (l.lumps.length >= MAX_LUMPS_PER_LINE) return;
    updateLine(l.key, { lumps: [...l.lumps, ""] });
    setFocus(`${l.key}:${l.lumps.length}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createChallan({
        date,
        jobberId,
        catalogId,
        fabricDetail,
        remarks,
        designPhotoUrl: photo?.url ?? null,
        designPhotoId: photo?.publicId ?? null,
        // Blank lump boxes are ignored; the server recomputes everything anyway.
        lines: lines.map((l) => ({ designId: l.designId, partType: l.partType, lumps: l.lumps.filter((m) => m.trim()) })),
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="card space-y-4">
        <label className="block">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Jobber<span className="text-red-600"> *</span></span>
          <select className="input" required value={jobberId} onChange={(e) => setJobberId(e.target.value)}>
            <option value="">Select jobber</option>
            {jobbers.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Catalogue<span className="text-red-600"> *</span></span>
          <select className="input" required value={catalogId} onChange={(e) => pickCatalog(e.target.value)}>
            <option value="">Select catalogue</option>
            {catalogs.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.volume}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Fabric detail</span>
          <input className="input" value={fabricDetail} onChange={(e) => setFabricDetail(e.target.value)} />
        </label>
      </div>

      {lines.map((l, li) => (
        <div key={l.key} className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Line {li + 1}</span>
            {lines.length > 1 && (
              <button type="button" className="text-sm text-red-700" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}>
                Remove line
              </button>
            )}
          </div>
          <select
            className="input"
            required
            value={l.designId}
            disabled={!catalog}
            onChange={(e) => updateLine(l.key, { designId: e.target.value })}
          >
            <option value="">{catalog ? "Design colour" : "Pick a catalogue first"}</option>
            {catalog?.designs.map((d) => (
              <option key={d.id} value={d.id}>{d.colourName}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            {PARTS.map((p) => (
              <button
                type="button"
                key={p}
                className={l.partType === p ? "btn-primary" : "btn-light"}
                onClick={() => updateLine(l.key, { partType: p })}
              >
                {PART_LABEL[p]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {l.lumps.map((m, i) => (
              <div key={i} className="relative">
                <span className="absolute left-2 top-1 text-[10px] text-slate-400">{i + 1}</span>
                <input
                  className="input pt-4 pb-1.5 text-right tabular-nums"
                  inputMode="decimal"
                  placeholder="m"
                  autoFocus={focus === `${l.key}:${i}`}
                  value={m}
                  onChange={(e) =>
                    updateLine(l.key, { lumps: l.lumps.map((x, j) => (j === i ? e.target.value.replace(/[^\d.]/g, "") : x)) })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (i === l.lumps.length - 1) addLump(l);
                    }
                  }}
                />
                {l.lumps.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove lump ${i + 1}`}
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-slate-300 text-xs leading-5"
                    onClick={() => updateLine(l.key, { lumps: l.lumps.filter((_, j) => j !== i) })}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button type="button" className="btn-light" onClick={() => addLump(l)}>
              + Add lump
            </button>
            <span className="text-sm">
              {l.lumps.filter((m) => m.trim()).length} lumps · <b className="tabular-nums">{sumMeters(l.lumps)} m</b>
            </span>
          </div>
        </div>
      ))}

      <button type="button" className="btn-light w-full" onClick={() => setLines([...lines, newLine()])}>
        + Add line (colour / part)
      </button>

      <div className="card space-y-4">
        <PhotoInput label="Design photo" value={photo} onChange={setPhoto} />
        <label className="block">
          <span className="label">Remarks</span>
          <textarea className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="sticky bottom-2 z-10 flex items-center gap-3 rounded-xl bg-navy p-3 text-white shadow-lg">
        <div className="flex-1">
          <div className="text-xs opacity-80">Total</div>
          <div className="text-xl font-bold tabular-nums">{grandTotal} m</div>
        </div>
        <button className="btn bg-white text-navy" disabled={pending}>
          {pending ? "Saving…" : "Save challan"}
        </button>
      </div>
    </form>
  );
}
