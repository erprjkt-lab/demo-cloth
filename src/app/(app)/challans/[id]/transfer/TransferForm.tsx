"use client";

import { useState, useTransition } from "react";
import { sumMeters } from "@/lib/validation";
import { transferChallan } from "../../actions";

type Line = { id: string; label: string; lumps: { id: string; seq: number; meters: string }[] };

export function TransferForm({
  challanId,
  lines,
  jobbers,
}: {
  challanId: string;
  lines: Line[];
  jobbers: { id: string; name: string }[];
}) {
  const [toJobberId, setTo] = useState("");
  const [type, setType] = useState<"FULL" | "PARTIAL">("FULL");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      ids.forEach((i) => (on ? n.add(i) : n.delete(i)));
      return n;
    });
  const all = lines.flatMap((l) => l.lumps);
  const moving = type === "FULL" ? all : all.filter((x) => picked.has(x.id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await transferChallan(challanId, { toJobberId, type, lumpIds: [...picked], note });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="card space-y-4">
        <label className="block">
          <span className="label">Move to jobber<span className="text-red-600"> *</span></span>
          <select className="input" required value={toJobberId} onChange={(e) => setTo(e.target.value)}>
            <option value="">Select jobber</option>
            {jobbers.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={type === "FULL" ? "btn-primary" : "btn-light"} onClick={() => setType("FULL")}>
            Full transfer
          </button>
          <button type="button" className={type === "PARTIAL" ? "btn-primary" : "btn-light"} onClick={() => setType("PARTIAL")}>
            Custom (lumps)
          </button>
        </div>
      </div>

      {type === "PARTIAL" &&
        lines.map((l) => {
          const allOn = l.lumps.every((x) => picked.has(x.id));
          return (
            <div key={l.id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{l.label}</span>
                <button type="button" className="text-sm text-brand" onClick={() => toggle(l.lumps.map((x) => x.id), !allOn)}>
                  {allOn ? "Clear" : "Select all"}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {l.lumps.map((x) => {
                  const on = picked.has(x.id);
                  return (
                    <button
                      type="button"
                      key={x.id}
                      aria-pressed={on}
                      onClick={() => toggle([x.id], !on)}
                      className={`rounded-md px-2 py-2 text-right text-sm tabular-nums ring-1 ${on ? "bg-brand text-white ring-brand" : "bg-white ring-slate-300"}`}
                    >
                      <span className="float-left text-[10px] opacity-60">{x.seq}</span>
                      {x.meters}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

      <div className="card">
        <label className="block">
          <span className="label">Note</span>
          <input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="sticky bottom-2 z-10 flex items-center gap-3 rounded-xl bg-navy p-3 text-white shadow-lg">
        <div className="flex-1">
          <div className="text-xs opacity-80">{moving.length} lumps moving</div>
          <div className="text-xl font-bold tabular-nums">{sumMeters(moving.map((x) => x.meters))} m</div>
        </div>
        <button className="btn bg-white text-navy" disabled={pending || !moving.length}>
          {pending ? "Moving…" : "Transfer"}
        </button>
      </div>
    </form>
  );
}
