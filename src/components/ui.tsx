import Link from "next/link";

export function Field({
  label,
  name,
  defaultValue,
  required,
  ...rest
}: { label: string; name: string; defaultValue?: string | number | null } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
>) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input className="input" name={name} defaultValue={defaultValue ?? ""} required={required} {...rest} />
    </label>
  );
}

/** CoreFlow PageHeader: 20px title, optional subtitle, actions on the right. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex min-w-40 flex-1 items-center gap-2">
        {back && (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-lg leading-none text-slate-600 hover:border-brand hover:text-brand"
          >
            ‹
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function SearchBox({ q, placeholder }: { q?: string; placeholder: string }) {
  return (
    <form className="mb-3">
      <input className="input" type="search" name="q" defaultValue={q} placeholder={placeholder} />
    </form>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-slate-500">{children}</p>;
}
