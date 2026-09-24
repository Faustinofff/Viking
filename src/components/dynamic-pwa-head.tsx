"use client";
import { useEffect, useRef } from "react";
import { useStudentBranding } from "@/lib/use-student-branding";

const VIKING_NAME = "Viking";
const DEFAULT_THEME = "#0a0a0a";

/** Aplica el branding del coach a la identidad PWA (manifest, ícono de iOS y títulos)
 * para que la app instalada use el logo del coach. Fallback: Viking. */
export default function DynamicPwaHead() {
  const { branding, coachId } = useStudentBranding();
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (blobUrlRef.current) {
      try { URL.revokeObjectURL(blobUrlRef.current); } catch {}
      blobUrlRef.current = null;
    }

    if (!coachId) return;

    const brandName = branding?.brandName?.trim() || VIKING_NAME;
    const hasIcons = branding?.brandIcon512 || branding?.brandIcon192 || branding?.brandLogoUrl;
    const brand = branding && (brandName !== VIKING_NAME || hasIcons);

    const appleIcon = brand
      ? (branding!.brandIcon180 ?? branding!.brandLogoUrl ?? "/app-icon.png")
      : "/app-icon.png";
    const appleLink = document.getElementById("pwa-apple-icon") as HTMLLinkElement | null;
    if (appleLink) appleLink.href = appleIcon;

    const appleTitle = document.getElementById("pwa-apple-title") as HTMLMetaElement | null;
    if (appleTitle) appleTitle.content = brand ? brandName : VIKING_NAME;

    const theme = brand && branding!.brandColor ? branding!.brandColor : DEFAULT_THEME;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", theme);

    const manifestLink = document.getElementById("pwa-manifest") as HTMLLinkElement | null;
    if (!manifestLink) return;

    if (!brand) {
      manifestLink.href = "/manifest.json";
      return;
    }

    const icon192 = branding!.brandIcon192 ?? "/app-icon.png";
    const icon512 = branding!.brandIcon512 ?? "/app-icon.png";

    const manifest = {
      name: brandName,
      short_name: brandName.slice(0, 12),
      description: "Plataforma premium de entrenamiento para coaches y alumnos",
      start_url: "/login",
      display: "standalone",
      display_override: ["standalone", "minimal-ui", "browser"],
      scope: "/",
      id: "/",
      background_color: DEFAULT_THEME,
      theme_color: theme,
      orientation: "portrait",
      icons: [
        { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/app-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/app-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    manifestLink.href = url;
  }, [branding, coachId]);

  return null;
}