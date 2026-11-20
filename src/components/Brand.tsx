// The one place that names the business: a "YE" monogram and the name.
export const BRAND = { name: "Yash", accent: "Enterprise", tagline: "Job Challan ERP", monogram: "YE" };

/** Sky monogram. On the navy sidebar it sits on a soft sky tile; `solid` puts it on navy for white surfaces. */
export function BrandMark({ size = 32, solid = false }: { size?: number; solid?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center font-display font-bold text-[#7dd3fc]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        borderRadius: size * 0.28,
        background: solid ? "#0B132B" : "rgba(56,189,248,0.14)",
      }}
    >
      {BRAND.monogram}
    </div>
  );
}

export function BrandName({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={`font-display text-[16px] leading-tight font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
        {BRAND.name} {BRAND.accent}
      </span>
      <span className={`text-[9.5px] font-semibold tracking-[0.12em] uppercase ${dark ? "text-white/45" : "text-slate-400"}`}>
        {BRAND.tagline}
      </span>
    </div>
  );
}
