// Self-check for the validation rules that guard money-like data. Run: npm run check
import assert from "node:assert/strict";
import { catalogSchema, challanSchema, qcSchema, sumMeters, taskSchema } from "../src/lib/validation";
import { challanNo, dueLabel } from "../src/lib/format";
import { canSetStatus, nextStatus } from "../src/lib/jobs";
import { can, effectivePerms } from "../src/lib/permissions";

const line = (lumps: string[]) => ({ designId: "d1", partType: "TOP", lumps });
const challan = (lumps: string[]) => ({
  date: "2026-11-18",
  jobberId: "j1",
  catalogId: "c1",
  fabricDetail: "",
  remarks: "",
  designPhotoUrl: null,
  designPhotoId: null,
  lines: [line(lumps)],
});

// The prototype bug: CH-0010 saved 49,535,449 m.
assert.equal(challanSchema.safeParse(challan(["49535449"])).success, false);
assert.equal(challanSchema.safeParse(challan(["0.5"])).success, false);
assert.equal(challanSchema.safeParse(challan(["12.345"])).success, false);
assert.equal(challanSchema.safeParse(challan(["abc"])).success, false);
assert.equal(challanSchema.safeParse(challan([])).success, false);
assert.equal(challanSchema.safeParse(challan(["45.5", "120", "22.25"])).success, true);

// Exact decimals: float would give 0.30000000000000004.
assert.equal(sumMeters(["0.1", "0.2"]), "0.30");
assert.equal(sumMeters(["45.5", "120", "22.25", ""]), "187.75");
assert.equal(sumMeters(Array(100).fill("99.99")), "9999.00");

// PDF example: S-XL at 50 and XXL-5XL at 200 = 1000 per design.
const catalog = (pieces: number, big: number) => ({
  name: "Sajni",
  volume: "Vol 2",
  code: "",
  fabric: "",
  type: "TWO_PC",
  piecesPerDesign: pieces,
  designs: [{ colourName: "Green" }],
  sizes: { S: 50, M: 50, L: 50, XL: 50, XXL: big, XXXL: big, XXXXL: big, XXXXXL: big },
  photoUrl: null,
  photoPublicId: null,
});
assert.equal(catalogSchema.safeParse(catalog(1000, 200)).success, true);
assert.equal(catalogSchema.safeParse(catalog(1000, 199)).success, false);

// Tasks: optional fields may arrive as undefined from the form; dates are ISO strings.
const task = (dueAt?: string) => ({ title: "Sample", assignedToUserId: "u1", dueAt });
assert.equal(taskSchema.safeParse(task()).success, true);
assert.equal(taskSchema.safeParse(task("2026-11-18T05:00:00.000Z")).success, true);
assert.equal(taskSchema.safeParse(task("tomorrow")).success, false);
assert.equal(challanNo(7), "CH-0007");

// Job status: jobbers only take their own next step; office can correct anything.
assert.equal(nextStatus("ASSIGNED"), "MATERIAL_RECEIVED");
assert.equal(nextStatus("COMPLETED"), undefined);
assert.equal(canSetStatus("JOBBER", "ASSIGNED", "MATERIAL_RECEIVED"), true);
assert.equal(canSetStatus("JOBBER", "ASSIGNED", "IN_PROGRESS"), false); // no skipping
assert.equal(canSetStatus("JOBBER", "SENT_BACK", "COMPLETED"), false); // office confirms receipt
assert.equal(canSetStatus("JOBBER", "IN_PROGRESS", "MATERIAL_RECEIVED"), false); // no going back
assert.equal(canSetStatus("STAFF", "SENT_BACK", "COMPLETED"), true);
assert.equal(canSetStatus("STAFF", "FINISHED", "IN_PROGRESS"), true);
// Draft: entered only on create, left only through approval, never via a plain status change.
assert.equal(nextStatus("DRAFT"), "ASSIGNED");
assert.equal(canSetStatus("ADMIN", "DRAFT", "ASSIGNED"), false);
assert.equal(canSetStatus("ADMIN", "IN_PROGRESS", "DRAFT"), false);
assert.equal(canSetStatus("JOBBER", "DRAFT", "ASSIGNED"), false);
// Approving is admin-only by default; it can be granted per user.
assert.equal(can(effectivePerms("STAFF", []), "jobs", "approve"), false);
assert.equal(can(effectivePerms("ADMIN", []), "jobs", "approve"), true);
assert.equal(
  can(effectivePerms("STAFF", [{ module: "jobs", read: true, write: true, modify: true, delete: false, approve: true }]), "jobs", "approve"),
  true,
);
assert.equal(can(effectivePerms("STAFF", []), "challans", "approve"), false); // only Job Work has Approve

// Permissions: role defaults, per-user overrides, admin can't be locked out.
const staff = effectivePerms("STAFF", []);
assert.equal(can(staff, "challans", "write"), true);
assert.equal(can(staff, "challans", "delete"), false);
assert.equal(can(staff, "users"), false);
const custom = effectivePerms("STAFF", [{ module: "challans", read: true, write: false, modify: false, delete: true, approve: false }]);
assert.equal(can(custom, "challans", "write"), false);
assert.equal(can(custom, "challans", "delete"), true);
assert.equal(can(effectivePerms("JOBBER", []), "catalogs"), false);
assert.equal(can(effectivePerms("ADMIN", [{ module: "users", read: false, write: false, modify: false, delete: false, approve: false }]), "users", "modify"), true);
// Jobbers have no delete action, whatever is saved.
assert.equal(can(effectivePerms("STAFF", [{ module: "jobbers", read: true, write: true, modify: true, delete: true, approve: true }]), "jobbers", "delete"), false);

// QC on receipt: counts must make sense (rework with nothing wrong is refused on the server).
assert.equal(qcSchema.safeParse({ receivedPieces: 1000, outcome: "ACCEPT" }).success, true);
assert.equal(qcSchema.safeParse({ receivedPieces: 990, rejectedPieces: 5, rejectReason: "loose stitching", outcome: "REWORK" }).success, true);
assert.equal(qcSchema.safeParse({ receivedPieces: 10, rejectedPieces: 11, outcome: "ACCEPT" }).success, false); // rejected > received
assert.equal(qcSchema.safeParse({ outcome: "REWORK", issues: [{ type: "DEFECTIVE", qty: 3, note: "loose stitching" }] }).success, true);
assert.equal(qcSchema.safeParse({ outcome: "ACCEPT", issues: [{ type: "MISSING", qty: 0 }] }).success, false);
assert.equal(qcSchema.safeParse({ outcome: "ACCEPT", issues: [{ type: "LOST" }] }).success, false);

// Due labels count calendar days in IST, so 23:30 IST tonight is still "Today".
const now = new Date("2026-11-20T06:00:00Z"); // 11:30 IST
assert.equal(dueLabel(new Date("2026-11-20T18:00:00Z"), now).text, "Today"); // 23:30 IST
assert.equal(dueLabel(new Date("2026-11-20T19:00:00Z"), now).text, "Tomorrow"); // 00:30 IST next day
assert.equal(dueLabel(new Date("2026-11-18T06:00:00Z"), now).text, "Overdue 2 days");
assert.equal(dueLabel(new Date("2026-11-25T06:00:00Z"), now).text, "In 5 days");

console.log("check: all passed");
