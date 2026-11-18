// The one place that names the business. CoreFlow's logo block, with a monogram in place of the logo.
export const BRAND = { name: "Yash", accent: "Enterprise", tagline: "Job Challan ERP", monogram: "YE" };

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg border border-[#00a0e3]/25 bg-[#00a0e3]/10 font-display font-bold text-[#00a0e3]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {BRAND.monogram}
    </div>
  );
}

export function BrandName({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={`font-display text-[16px] leading-tight font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
        {BRAND.name} <span className="text-[#00a0e3]">{BRAND.accent}</span>
      </span>
      <span className={`text-[9.5px] font-semibold tracking-[0.12em] uppercase ${dark ? "text-white/45" : "text-slate-400"}`}>
        {BRAND.tagline}
      </span>
    </div>
  );
}
