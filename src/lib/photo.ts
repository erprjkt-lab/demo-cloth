// Browser-only. The one place that knows the photo provider: swap Cloudinary here.
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadPhoto(file: File): Promise<{ url: string; publicId: string }> {
  if (!TYPES.includes(file.type)) throw new Error("Only JPG, PNG or WebP photos");
  if (file.size > MAX_BYTES) throw new Error("Photo must be under 10 MB");

  const sign = await fetch("/api/upload-sign", { method: "POST" });
  if (!sign.ok) throw new Error(sign.status === 503 ? "Photo upload is not set up yet" : "Could not start upload");
  const { cloudName, apiKey, timestamp, folder, signature } = await sign.json();

  const body = new FormData();
  body.append("file", await compress(file));
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}

/** Longest side 1280 px, JPEG quality 0.7. */
async function compress(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read photo"))), "image/jpeg", 0.7),
  );
}
