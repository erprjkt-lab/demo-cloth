import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Job Challan · Yash Enterprise",
    short_name: "Job Challan",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#1e3a8a",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
