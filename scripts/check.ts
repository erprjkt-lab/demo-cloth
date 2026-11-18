// Self-check for the validation rules that guard money-like data. Run: npm run check
import assert from "node:assert/strict";
import { catalogSchema, challanSchema, sumMeters, taskSchema } from "../src/lib/validation";
import { challanNo, fromLocalInput } from "../src/lib/format";

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

// Task times entered on the phone are IST, whatever the server's timezone.
assert.equal(fromLocalInput("2026-11-18T10:30").toISOString(), "2026-11-18T05:00:00.000Z");
const task = (challanNo: string) => ({ title: "Sample", description: "", assignedToUserId: "u1", challanNo, dueAt: "", remindAt: "" });
assert.equal(taskSchema.safeParse(task("CH-0012")).success, true);
assert.equal(taskSchema.safeParse(task("")).success, true);
assert.equal(taskSchema.safeParse(task("abc")).success, false);
assert.equal(challanNo(7), "CH-0007");

console.log("check: all passed");
