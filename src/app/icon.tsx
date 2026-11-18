import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: string | Promise<string> }) {
  const s = Number(await id);
  return new ImageResponse(<Mark size={s} />, { width: s, height: s });
}

// Full-bleed square so it also works as a maskable icon.
export function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e3a8a",
        color: "white",
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
    >
      JC
    </div>
  );
}
