import { createHash } from "node:crypto";
import { requireUser, OFFICE } from "@/lib/auth";

// Signs a direct browser→Cloudinary upload so the API secret never leaves the server.
export async function POST() {
  await requireUser(...OFFICE);
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) return new Response("Photo upload not configured", { status: 503 });

  const folder = "job-challan";
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return Response.json({ cloudName, apiKey, timestamp, folder, signature });
}
