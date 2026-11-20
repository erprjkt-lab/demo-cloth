export const challanNo = (no: number) => `CH-${String(no).padStart(4, "0")}`;

/** Cloudinary resize transform; leaves non-Cloudinary URLs untouched. */
export const thumb = (url: string, w = 200) => url.replace("/upload/", `/upload/w_${w},c_limit,q_auto,f_auto/`);

export const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

// ponytail: fixed IST; the business is in India. Make it a setting if that ever changes.
export const TZ = "Asia/Kolkata";

export const fmtDateTime = (d: Date) =>
  d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

/** Calendar days from today (IST) to the given day: 0 today, -2 two days overdue. */
export function daysUntil(d: Date, now = new Date()) {
  const day = (x: Date) => Date.parse(`${x.toLocaleDateString("en-CA", { timeZone: TZ })}T00:00:00Z`);
  return Math.round((day(d) - day(now)) / 86_400_000);
}

/** "Overdue 2 days" · "Today" · "Tomorrow" · "In 5 days", plus a tone for colouring it. */
export function dueLabel(d: Date, now = new Date()): { text: string; tone: "overdue" | "soon" | "later" } {
  const n = daysUntil(d, now);
  if (n < 0) return { text: `Overdue ${-n} day${n === -1 ? "" : "s"}`, tone: "overdue" };
  if (n === 0) return { text: "Today", tone: "soon" };
  if (n === 1) return { text: "Tomorrow", tone: "soon" };
  return { text: `In ${n} days`, tone: n <= 3 ? "soon" : "later" };
}
