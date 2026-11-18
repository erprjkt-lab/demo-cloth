import type { Jobber } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Field } from "@/components/ui";
import { saveJobber } from "./actions";

export function JobberForm({ jobber }: { jobber?: Jobber }) {
  return (
    <div className="card">
      <ActionForm action={saveJobber.bind(null, jobber?.id ?? null)}>
        <Field label="Jobber name" name="name" defaultValue={jobber?.name} required />
        <Field label="Owner name" name="ownerName" defaultValue={jobber?.ownerName} />
        <Field label="GST no" name="gstNo" defaultValue={jobber?.gstNo} autoCapitalize="characters" maxLength={15} />
        <Field label="Mobile 1" name="mobile1" defaultValue={jobber?.mobile1} type="tel" inputMode="numeric" maxLength={10} required />
        <Field label="Mobile 2" name="mobile2" defaultValue={jobber?.mobile2} type="tel" inputMode="numeric" maxLength={10} />
        <label className="block">
          <span className="label">Address</span>
          <textarea name="address" className="input" rows={3} defaultValue={jobber?.address ?? ""} />
        </label>
      </ActionForm>
    </div>
  );
}
