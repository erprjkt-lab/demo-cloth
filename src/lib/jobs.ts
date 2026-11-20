// Job work status flow. Pure data, shared by the tables (client) and the status actions (server).

export const JOB_STEPS = ["DRAFT", "ASSIGNED", "MATERIAL_RECEIVED", "IN_PROGRESS", "FINISHED", "SENT_BACK", "COMPLETED"] as const;
export type JobStatus = (typeof JOB_STEPS)[number];

/** Label and dot colour (design system: status is a coloured dot plus text, never a filled tag). */
export const JOB_STATUS: Record<JobStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "#D97706" },
  ASSIGNED: { label: "Assigned", color: "#94A3B8" },
  MATERIAL_RECEIVED: { label: "Fabric received", color: "#0891B2" },
  IN_PROGRESS: { label: "In progress", color: "#0284C7" },
  FINISHED: { label: "Finished", color: "#7C3AED" },
  SENT_BACK: { label: "Sent back", color: "#EA580C" },
  COMPLETED: { label: "Completed", color: "#16A34A" },
};

/** The button that moves a job to its next step, and who takes that step. */
export const NEXT_STEP: Partial<Record<JobStatus, { label: string; by: "APPROVER" | "JOBBER" | "OFFICE" }>> = {
  DRAFT: { label: "Approve & assign", by: "APPROVER" },
  ASSIGNED: { label: "Fabric received", by: "JOBBER" },
  MATERIAL_RECEIVED: { label: "Start work", by: "JOBBER" },
  IN_PROGRESS: { label: "Mark finished", by: "JOBBER" },
  FINISHED: { label: "Send back", by: "JOBBER" },
  SENT_BACK: { label: "Receive & QC", by: "OFFICE" },
};

export const nextStatus = (s: JobStatus): JobStatus | undefined => JOB_STEPS[JOB_STEPS.indexOf(s) + 1];

/** Jobs that can still move to another jobber: the goods haven't been finished or sent back. */
export const TRANSFERABLE: JobStatus[] = ["DRAFT", "ASSIGNED", "MATERIAL_RECEIVED", "IN_PROGRESS"];

/**
 * Jobbers may only take their own next step. Office users with modify access may take any
 * step, including corrections backwards. Draft is entered only on create and left only through
 * approval (approveJob), never through a plain status change.
 */
export function canSetStatus(role: "ADMIN" | "STAFF" | "JOBBER", from: JobStatus, to: JobStatus) {
  if (from === "DRAFT" || to === "DRAFT") return false;
  if (role !== "JOBBER") return from !== to;
  return nextStatus(from) === to && NEXT_STEP[from]?.by === "JOBBER";
}

export const jobNo = (no: number) => `JW-${String(no).padStart(4, "0")}`;

// Quality check when a job comes back (Sent Back → Confirm Received).
export const QC_RESULT = {
  PASSED: { label: "QC passed", color: "#16A34A" },
  ISSUES_ACCEPTED: { label: "Accepted with issues", color: "#B45309" },
  REWORK: { label: "Sent for rework", color: "#B91C1C" },
} as const;
export type QcResult = keyof typeof QC_RESULT;

export const QC_ISSUE_TYPES = ["MISSING", "DEFECTIVE", "NOT_DONE"] as const;
export const QC_ISSUE_LABEL: Record<(typeof QC_ISSUE_TYPES)[number], string> = {
  MISSING: "Missing",
  DEFECTIVE: "Defective",
  NOT_DONE: "Not done properly",
};
