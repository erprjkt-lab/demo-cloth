"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { challanNo } from "@/lib/format";
import { jobNo, TRANSFERABLE } from "@/lib/jobs";
import { pushToJobber } from "@/lib/push";
import { firstError } from "@/lib/validation";

const jobTransferSchema = z.object({
  jobWorkId: z.string({ required_error: "Pick the job" }).min(1, "Pick the job"),
  toJobberId: z.string({ required_error: "Pick the new jobber" }).min(1, "Pick the new jobber"),
  moveChallans: z.boolean().default(true),
  note: z.string().trim().max(200).nullish(),
});

/**
 * Moves a job to another jobber. An approved job goes back to Assigned, because the new jobber
 * has to receive the material before starting. With moveChallans, the fabric on the job's
 * challans moves too (each logged as its own challan transfer).
 */
export async function transferJob(input: unknown): Promise<{ error?: string }> {
  const me = await requirePerm("transfers", "write");
  if (me.role === "JOBBER") return { error: "Not allowed" };
  const parsed = jobTransferSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { jobWorkId, toJobberId, moveChallans, note } = parsed.data;

  const job = await db.jobWork.findFirst({
    where: { id: jobWorkId, deletedAt: null },
    include: { jobber: { select: { name: true } }, challans: { where: { deletedAt: null }, select: { id: true, no: true, jobberId: true } } },
  });
  if (!job) return { error: "Job not found" };
  if (!TRANSFERABLE.includes(job.status)) return { error: "Finished or sent-back jobs can't be transferred" };
  if (job.jobberId === toJobberId) return { error: "Pick a different jobber" };
  const to = await db.jobber.findFirst({ where: { id: toJobberId, deletedAt: null }, select: { name: true } });
  if (!to) return { error: "Jobber not found" };

  const from = job.jobberId;
  const summary = [`${jobNo(job.no)} moved from ${job.jobber.name} to ${to.name}`, note].filter(Boolean).join(" · ");
  // Only challans still with the old jobber; ones already moved elsewhere stay where they are.
  const challans = moveChallans ? job.challans.filter((c) => c.jobberId === from) : [];
  const newStatus = job.status === "DRAFT" ? "DRAFT" : "ASSIGNED";

  try {
    await db.$transaction(async (tx) => {
      const r = await tx.jobWork.updateMany({ where: { id: job.id, jobberId: from, status: job.status }, data: { jobberId: toJobberId, status: newStatus } });
      if (r.count !== 1) throw new Error("stale");
      await tx.transfer.create({ data: { jobWorkId: job.id, fromJobberId: from, toJobberId, type: "JOB", createdById: me.id, note: summary } });
      await tx.jobStatusLog.create({ data: { jobWorkId: job.id, status: newStatus, userId: me.id, note: summary } });
      for (const c of challans) {
        await tx.challan.update({ where: { id: c.id }, data: { jobberId: toJobberId } });
        await tx.transfer.create({
          data: { challanId: c.id, fromJobberId: from, toJobberId, type: "FULL", createdById: me.id, note: `With job ${jobNo(job.no)}` },
        });
      }
    });
  } catch {
    return { error: "This job was just changed by someone else. Refresh and try again." };
  }

  if (newStatus !== "DRAFT") {
    const fabric = challans.length ? ` with ${challans.map((c) => challanNo(c.no)).join(", ")}` : "";
    await pushToJobber(toJobberId, { title: `New job ${jobNo(job.no)}`, body: `${job.title}${fabric}`, url: "/jobs" });
    await pushToJobber(from, { title: `${jobNo(job.no)} moved`, body: `${job.title} now goes to another jobber`, url: "/jobs" });
  }
  revalidatePath("/transfers");
  revalidatePath("/jobs");
  return {};
}
