import "server-only";
import webpush from "web-push";
import { db } from "./db";

const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
const ready = Boolean(pub && priv);
if (ready) webpush.setVapidDetails(subject || "mailto:admin@example.com", pub!, priv!);

/** Best effort: never throws. Drops subscriptions the browser has revoked. */
export async function pushToUser(userId: string, payload: { title: string; body: string; url: string }) {
  if (!ready) return;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }),
  );
}
