export const challanNo = (no: number) => `CH-${String(no).padStart(4, "0")}`;

/** Cloudinary resize transform; leaves non-Cloudinary URLs untouched. */
export const thumb = (url: string, w = 200) => url.replace("/upload/", `/upload/w_${w},c_limit,q_auto,f_auto/`);

export const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

// ponytail: fixed IST; the business is in India. Make it a setting if that ever changes.
export const TZ = "Asia/Kolkata";

export const fmtDateTime = (d: Date) =>
  d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

/** <input type="datetime-local"> value ("2026-11-18T10:30") read as IST. */
export const fromLocalInput = (v: string) => new Date(`${v}:00+05:30`);

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
