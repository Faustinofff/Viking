import type { Viewport } from "next";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0b",
};

export default function LandingRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" style={{ background: "#0a0a0b" }}>
      <body>{children}</body>
    </html>
  );
}