import { createHash } from "node:crypto";
import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

// Signs a direct browser→Cloudinary upload so the API secret never leaves the server.
export async function POST() {
  const me = await getUser();
  // Anyone who can add catalogues or challans may upload photos.
  if (!me || !(can(me.perms, "catalogs", "write") || can(me.perms, "catalogs", "modify") || can(me.perms, "challans", "write"))) {
    return new Response("Forbidden", { status: 403 });
  }
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) return new Response("Photo upload not configured", { status: 503 });

  const folder = "job-challan";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return Response.json({ cloudName, apiKey, timestamp, folder, signature });
}
