// Shared by client forms and Server Actions. Plain constants only: no Prisma imports here.
import { z } from "zod";

export const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL", "XXXXL", "XXXXXL"] as const;
export const SIZE_LABEL: Record<(typeof SIZES)[number], string> = {
  S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL", XXXL: "3XL", XXXXL: "4XL", XXXXXL: "5XL",
};
export const ROLES = ["ADMIN", "STAFF", "JOBBER"] as const;

/** One entry on the Masters page (a part or a catalogue type). */
export const masterSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40, "Name is too long (max 40)"),
  sort: z.coerce.number().int().min(0).max(999).default(0),
});

// ponytail: guessed limits (paper lumps run 20-130 m); confirm with the owner.
export const LUMP_MIN = 1;
export const LUMP_MAX = 500;
export const MAX_LUMPS_PER_LINE = 100;

// Form libraries send undefined/null for untouched fields, so optional ones accept both.
const req = (label: string, max = 100) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
const opt = (max = 200) => z.string().trim().max(max).nullish().transform((v) => v || null);
const optMatch = (re: RegExp, msg: string) =>
  z.string().trim().nullish().refine((v) => !v || re.test(v), msg).transform((v) => v || null);
const optId = z.string().nullish().transform((v) => v || null);
const mobile = /^\d{10}$/;

export const jobberSchema = z.object({
  name: req("Name"),
  gstNo: optMatch(/^[0-9]{2}[A-Z0-9]{13}$/, "GST no must be 15 characters, e.g. 24ABCDE1234F1Z5"),
  ownerName: opt(100),
  mobile1: z.string({ required_error: "Mobile 1 is required" }).trim().regex(mobile, "Mobile 1 must be 10 digits"),
  mobile2: optMatch(mobile, "Mobile 2 must be 10 digits"),
  address: opt(500),
});

const count = (label: string, max: number) =>
  z.coerce.number().int(`${label} must be a whole number`).min(0).max(max);

export const catalogSchema = z
  .object({
    name: req("Name"),
    volume: opt(50),
    code: opt(50),
    fabric: opt(200),
    typeId: z.string().min(1, "Pick a catalogue type"),
    piecesPerDesign: count("Pieces per design", 1_000_000).refine((n) => n > 0, "Pieces per design is required"),
    designs: z
      .array(z.object({ id: z.string().optional(), colourName: req("Design colour", 50) }))
      .min(1, "Add at least one design")
      .max(200),
    sizes: z.record(z.enum(SIZES), count("Size qty", 1_000_000)),
    photoUrl: z.string().url().nullish().transform((v) => v ?? null),
    photoPublicId: optId,
  })
  .refine((c) => sizeTotal(c.sizes) === c.piecesPerDesign, {
    message: "Size ratio must add up to pieces per design",
    path: ["sizes"],
  });

export function sizeTotal(sizes: Partial<Record<string, number>>) {
  return Object.values(sizes).reduce<number>((a, n) => a + (n ?? 0), 0);
}

// Meters travel as strings ("45.25") so nothing passes through float on the way to Decimal.
export const meterSchema = z
  .string()
  .trim()
  .regex(/^\d{1,4}(\.\d{1,2})?$/, "Meters must be a number with up to 2 decimals")
  .refine((m) => toCents(m) >= LUMP_MIN * 100 && toCents(m) <= LUMP_MAX * 100, `Each lump must be ${LUMP_MIN}–${LUMP_MAX} m`);

export const challanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
  jobberId: z.string().min(1, "Pick a jobber"),
  catalogId: z.string().min(1, "Pick a catalogue"),
  jobWorkId: optId,
  fabricDetail: opt(200),
  remarks: opt(500),
  designPhotoUrl: z.string().url().nullish().transform((v) => v ?? null),
  designPhotoId: optId,
  lines: z
    .array(
      z.object({
        designId: z.string().min(1, "Pick a design colour on every line"),
        partId: z.string().min(1, "Pick a part on every line"),
        lumps: z.array(meterSchema).min(1, "Every line needs at least one lump").max(MAX_LUMPS_PER_LINE),
      }),
    )
    .min(1, "Add at least one line"),
});

export const transferSchema = z.object({
  toJobberId: z.string().min(1, "Pick the new jobber"),
  type: z.enum(["FULL", "PARTIAL"]),
  lumpIds: z.array(z.string()).max(5000),
  note: opt(200),
});

export const taskSchema = z.object({
  title: req("Title", 200),
  description: opt(1000),
  assignedToUserId: z.string().min(1, "Pick who should do it"),
  challanId: optId,
  dueAt: z.string().datetime().nullish().transform((v) => (v ? new Date(v) : null)),
  remindAt: z.string().datetime().nullish().transform((v) => (v ? new Date(v) : null)),
});

export const jobWorkSchema = z.object({
  title: req("Job title", 200),
  jobberId: z.string({ required_error: "Pick a jobber" }).min(1, "Pick a jobber"),
  catalogId: optId,
  pieces: z.coerce
    .number()
    .int("Pieces must be a whole number")
    .min(1)
    .max(10_000_000)
    .nullish()
    .transform((v) => v ?? null),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v || null),
  notes: opt(1000),
});

/**
 * Office QC on receipt: pieces received, how many of those are rejected, and any other issues.
 * Not received (sent − received) is worked out on the server. No problems means it passed;
 * otherwise the office either accepts and closes the job (problems stay open to follow up) or
 * sends it back to the jobber for rework.
 */
export const qcSchema = z
  .object({
    receivedPieces: z.coerce.number().int().min(0).max(10_000_000).nullish().transform((v) => v ?? null),
    rejectedPieces: z.coerce.number().int().min(0).max(10_000_000).nullish().transform((v) => v ?? 0),
    rejectReason: opt(300),
    issues: z
      .array(
        z.object({
          type: z.enum(["MISSING", "DEFECTIVE", "NOT_DONE"], { required_error: "Pick what's wrong" }),
          qty: z.coerce.number().int().min(1, "Quantity must be at least 1").max(10_000_000).nullish().transform((v) => v ?? null),
          note: opt(300),
        }),
      )
      .max(50)
      .default([]),
    outcome: z.enum(["ACCEPT", "REWORK"]),
    notes: opt(1000),
  })
  .refine((q) => q.receivedPieces === null || q.rejectedPieces <= q.receivedPieces, {
    message: "Rejected can't be more than received",
    path: ["rejectedPieces"],
  });

export const userSchema = z
  .object({
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "User ID: 3-30 letters, digits, . _ -"),
    name: req("Name"),
    role: z.enum(ROLES),
    jobberId: optId,
    password: z.string({ required_error: "Password is required" }).min(8, "Password must be at least 8 characters").max(72),
  })
  .refine((u) => u.role !== "JOBBER" || u.jobberId, { message: "Pick the jobber for this login", path: ["jobberId"] });

export const userUpdateSchema = z
  .object({ name: req("Name"), role: z.enum(ROLES), jobberId: optId })
  .refine((u) => u.role !== "JOBBER" || u.jobberId, { message: "Pick the jobber for this login", path: ["jobberId"] });

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

/** First error message, for showing under a form. */
export function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Invalid input";
}

// Exact 2-decimal arithmetic on integers; used for live totals and server-side totals alike.
export function toCents(m: string) {
  const [i, f = ""] = m.trim().split(".");
  return Number(i || 0) * 100 + Number((f + "00").slice(0, 2));
}

export function sumMeters(meters: string[]) {
  const cents = meters.reduce((a, m) => (/^\d+(\.\d*)?$/.test(m.trim()) ? a + toCents(m) : a), 0);
  return (cents / 100).toFixed(2);
}
