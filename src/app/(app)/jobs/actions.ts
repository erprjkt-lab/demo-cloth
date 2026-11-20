"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { jobScope, requirePerm } from "@/lib/auth";
import { challanNo } from "@/lib/format";
import { canSetStatus, JOB_STATUS, JOB_STEPS, jobNo, QC_ISSUE_LABEL, QC_RESULT, type JobStatus } from "@/lib/jobs";
import { pushToJobber, pushToUser } from "@/lib/push";
import { firstError, jobWorkSchema, qcSchema, sumMeters } from "@/lib/validation";

type Result = { error?: string };
const toDate = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);

/** New jobs are always drafts: the jobber sees nothing until someone with Approve access approves it. */
export async function saveJob(id: string | null, input: unknown): Promise<Result & { id?: string }> {
  const me = await requirePerm("jobs", id ? "modify" : "write");
  if (me.role === "JOBBER") return { error: "Jobbers can only update the status of their jobs" };
  const parsed = jobWorkSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { dueDate, ...data } = parsed.data;

  if (!(await db.jobber.findFirst({ where: { id: data.jobberId, deletedAt: null } }))) return { error: "Jobber not found" };
  if (data.catalogId && !(await db.catalog.findFirst({ where: { id: data.catalogId, deletedAt: null } }))) {
    return { error: "Catalogue not found" };
  }

  if (id) {
    const job = await db.jobWork.findFirst({ where: { id, deletedAt: null } });
    if (!job) return { error: "Job not found" };
    // Once assigned, the fabric is with that jobber: moving it is a transfer, with its own history.
    if (job.status !== "DRAFT" && job.jobberId !== data.jobberId) {
      return { error: "This job is already assigned. Use Job Transfer to move it to another jobber." };
    }
    await db.jobWork.update({ where: { id }, data: { ...data, dueDate: toDate(dueDate) } });
    revalidatePath("/jobs");
    return { id };
  }

  const job = await db.jobWork.create({
    data: {
      ...data,
      dueDate: toDate(dueDate),
      createdById: me.id,
      status: "DRAFT",
      logs: { create: { status: "DRAFT", userId: me.id, note: "Draft created" } },
    },
  });
  revalidatePath("/jobs");
  return { id: job.id };
}

/** Draft → Assigned: the job appears on the jobber's phone and they are notified. */
export async function approveJob(id: string, note?: string): Promise<Result> {
  const me = await requirePerm("jobs", "approve");
  if (me.role === "JOBBER") return { error: "Not allowed" };
  const job = await db.jobWork.findFirst({ where: { id, deletedAt: null } });
  if (!job) return { error: "Job not found" };

  const updated = await db.$transaction(async (tx) => {
    const r = await tx.jobWork.updateMany({ where: { id, status: "DRAFT" }, data: { status: "ASSIGNED" } });
    if (r.count === 1) {
      await tx.jobStatusLog.create({
        data: { jobWorkId: id, status: "ASSIGNED", userId: me.id, note: note?.trim().slice(0, 500) || `Approved by ${me.name}` },
      });
    }
    return r.count === 1;
  });
  if (!updated) return { error: "Only draft jobs can be approved" };

  await pushToJobber(job.jobberId, { title: `New job ${jobNo(job.no)}`, body: job.title, url: "/jobs" });
  revalidatePath("/jobs");
  return {};
}

export async function setJobStatus(id: string, to: JobStatus, note?: string): Promise<Result> {
  const me = await requirePerm("jobs", "modify");
  if (!JOB_STEPS.includes(to)) return { error: "Unknown status" };
  const job = await db.jobWork.findFirst({ where: { id, deletedAt: null, ...jobScope(me) } });
  if (!job) return { error: "Job not found" };
  if (!canSetStatus(me.role, job.status, to)) return { error: `This job can't be moved to ${JOB_STATUS[to].label}` };

  try {
    await db.$transaction(async (tx) => {
      // Filter on the old status so two people updating at once can't both win.
      const r = await tx.jobWork.updateMany({ where: { id, status: job.status }, data: { status: to } });
      if (r.count !== 1) throw new Error("stale");
      await tx.jobStatusLog.create({ data: { jobWorkId: id, status: to, userId: me.id, note: note?.trim().slice(0, 500) || null } });
    });
  } catch {
    return { error: "This job was just updated by someone else. Refresh and try again." };
  }

  const msg = { title: `${jobNo(job.no)}: ${JOB_STATUS[to].label}`, body: `${job.title} (by ${me.name})`, url: "/jobs" };
  if (me.role === "JOBBER") await pushToUser(job.createdById, msg);
  else await pushToJobber(job.jobberId, msg);
  revalidatePath("/jobs");
  return {};
}

export async function deleteJob(id: string): Promise<Result> {
  await requirePerm("jobs", "delete");
  await db.jobWork.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/jobs");
  return {};
}

/** Everything the View drawer shows: status history and the challans that carried the fabric. */
export async function getJobDetail(id: string) {
  const me = await requirePerm("jobs");
  const job = await db.jobWork.findFirst({
    where: { id, deletedAt: null, ...jobScope(me) },
    include: {
      createdBy: { select: { name: true } },
      logs: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
      challans: {
        where: { deletedAt: null },
        orderBy: { no: "asc" },
        select: { id: true, no: true, date: true, lines: { select: { lumps: { select: { meters: true } } } } },
      },
      qcs: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true } },
          issues: { include: { resolvedBy: { select: { name: true } } } },
        },
      },
    },
  });
  if (!job) return null;
  return {
    createdBy: job.createdBy.name,
    createdAt: job.createdAt,
    logs: job.logs.map((l) => ({ id: l.id, status: l.status, note: l.note, by: l.user.name, at: l.createdAt })),
    challans: job.challans.map((c) => ({
      id: c.id,
      no: challanNo(c.no),
      date: c.date,
      meters: sumMeters(c.lines.flatMap((l) => l.lumps.map((x) => x.meters.toString()))),
    })),
    qcs: job.qcs.map((q) => ({
      id: q.id,
      at: q.createdAt,
      by: q.createdBy.name,
      result: q.result,
      receivedPieces: q.receivedPieces,
      missingPieces: q.missingPieces,
      rejectedPieces: q.rejectedPieces,
      notes: q.notes,
      issues: q.issues.map((i) => ({
        id: i.id,
        type: i.type,
        qty: i.qty,
        note: i.note,
        resolvedAt: i.resolvedAt,
        resolvedBy: i.resolvedBy?.name ?? null,
      })),
    })),
  };
}

/**
 * Sent Back → QC. Not received (sent − received) and rejected pieces become open issues, along
 * with any other issue listed. No issues: Completed. Issues + accept: Completed, issues stay open
 * to follow up. Issues + rework: back to the jobber as In Progress with the list of what to fix.
 */
export async function confirmReceipt(id: string, input: unknown): Promise<Result> {
  const me = await requirePerm("jobs", "modify");
  if (me.role === "JOBBER") return { error: "Only the office confirms receipt" };
  const parsed = qcSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { receivedPieces, rejectedPieces, rejectReason, outcome, notes } = parsed.data;

  const job = await db.jobWork.findFirst({ where: { id, deletedAt: null } });
  if (!job) return { error: "Job not found" };
  if (job.status !== "SENT_BACK") return { error: "Only jobs the jobber has sent back can be received" };
  if (job.pieces !== null && receivedPieces !== null && receivedPieces > job.pieces) {
    return { error: `Received can't be more than the ${job.pieces} pieces sent` };
  }

  // Counts are worked out here, never trusted from the client.
  const missingPieces = job.pieces !== null && receivedPieces !== null ? job.pieces - receivedPieces : null;
  const issues = [
    ...(missingPieces ? [{ type: "MISSING" as const, qty: missingPieces, note: "Not received" }] : []),
    ...(rejectedPieces ? [{ type: "DEFECTIVE" as const, qty: rejectedPieces, note: rejectReason ?? "Rejected in QC" }] : []),
    ...parsed.data.issues,
  ];
  if (outcome === "REWORK" && issues.length === 0) return { error: "Nothing is rejected or missing, so there's nothing to rework" };

  const result = issues.length === 0 ? "PASSED" : outcome === "REWORK" ? "REWORK" : "ISSUES_ACCEPTED";
  const to = result === "REWORK" ? "IN_PROGRESS" : "COMPLETED";
  const issueText = issues.map((i) => `${i.qty ? `${i.qty} ` : ""}${QC_ISSUE_LABEL[i.type].toLowerCase()}${i.note ? ` (${i.note})` : ""}`).join(", ");
  const summary = [
    QC_RESULT[result].label,
    receivedPieces !== null ? `${receivedPieces} pcs received` : null,
    issueText || null,
    notes,
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    await db.$transaction(async (tx) => {
      const r = await tx.jobWork.updateMany({ where: { id, status: "SENT_BACK" }, data: { status: to } });
      if (r.count !== 1) throw new Error("stale");
      await tx.jobQc.create({
        data: {
          jobWorkId: id,
          receivedPieces,
          missingPieces,
          rejectedPieces,
          result,
          notes,
          createdById: me.id,
          issues: { create: issues },
        },
      });
      await tx.jobStatusLog.create({ data: { jobWorkId: id, status: to, userId: me.id, note: summary.slice(0, 500) } });
      // A clean pass after rework means the earlier issues were fixed.
      if (result === "PASSED") {
        await tx.qcIssue.updateMany({ where: { qc: { jobWorkId: id }, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: me.id } });
      }
    });
  } catch {
    return { error: "This job was just updated by someone else. Refresh and try again." };
  }

  await pushToJobber(job.jobberId, {
    title: result === "REWORK" ? `${jobNo(job.no)} needs rework` : `${jobNo(job.no)} received`,
    body: result === "REWORK" ? issueText : QC_RESULT[result].label,
    url: "/jobs",
  });
  revalidatePath("/jobs");
  return {};
}

/** Closes one QC issue once it's been sorted out (pieces delivered, defect fixed, etc.). */
export async function resolveQcIssue(issueId: string): Promise<Result> {
  const me = await requirePerm("jobs", "modify");
  if (me.role === "JOBBER") return { error: "Only the office can close QC issues" };
  const r = await db.qcIssue.updateMany({ where: { id: issueId, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: me.id } });
  if (r.count !== 1) return { error: "Issue not found or already resolved" };
  revalidatePath("/jobs");
  return {};
}
