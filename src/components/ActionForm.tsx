"use client";

import { useActionState } from "react";

export type FormState = { error?: string; ok?: string } | undefined;

/** A <form> bound to a Server Action that returns {error} or redirects on success. */
export function ActionForm({
  action,
  children,
  submit = "Save",
  className = "space-y-4",
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : submit}
      </button>
    </form>
  );
}
