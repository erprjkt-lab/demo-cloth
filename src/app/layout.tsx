import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Same faces as CoreFlow ERP: Inter for UI, Space Grotesk for headings, Plex Mono for numbers.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-space-grotesk" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Job Challan · Yash Enterprise",
  description: "Fabric challans for stitching jobbers",
  appleWebApp: { capable: true, title: "Job Challan", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b132b" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
