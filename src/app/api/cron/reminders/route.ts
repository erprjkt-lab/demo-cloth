import { db } from "@/lib/db";
import { pushToUser } from "@/lib/push";

// Hit every ~15 min by .github/workflows/reminders.yml (or any cron) with the shared secret.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const due = await db.task.findMany({
    where: { status: "OPEN", remindedAt: null, remindAt: { lte: new Date() } },
    take: 200,
  });
  for (const t of due) {
    await pushToUser(t.assignedToUserId, { title: "Reminder", body: t.title, url: "/tasks?view=reminders" });
    await db.task.update({ where: { id: t.id }, data: { remindedAt: new Date() } });
  }
  return Response.json({ sent: due.length });
}
