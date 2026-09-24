"use client";
import { useEffect, useRef, useState } from "react";
import { useStudentBranding } from "@/lib/use-student-branding";

const VIKING_NAME = "Viking";
const VIKING_TITLE = "Viking — Plataforma de Entrenamiento";
const DEFAULT_THEME = "#0a0a0a";

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function applyVikingDefaults(manifestLink: HTMLLinkElement | null) {
  const appleLink = el<HTMLLinkElement>("pwa-apple-icon");
  if (appleLink) appleLink.href = "/app-icon.png";
  const title = el<HTMLMetaElement>("pwa-apple-title");
  if (title) title.content = VIKING_NAME;
  const appName = el<HTMLMetaElement>("pwa-app-name");
  if (appName) appName.content = VIKING_NAME;
  if (document.title !== VIKING_TITLE) document.title = VIKING_TITLE;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", DEFAULT_THEME);
  if (manifestLink) manifestLink.href = "/manifest.json";
}

/** Aplica el branding del coach a la identidad PWA (manifest, íconos y títulos)
 * para que la app instalada use el logo y nombre de la marca del coach.
 * Fallback completo: Viking. */
export default function DynamicPwaHead() {
  const { branding, coachId } = useStudentBranding();
  const blobUrlRef = useRef<string | null>(null);
  const lastJsonRef = useRef<string>("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const apply = () => {
      const manifestLink = el<HTMLLinkElement>("pwa-manifest");

      const brandName = branding?.brandName?.trim() || VIKING_NAME;
      const hasIcons = branding?.brandIcon512 || branding?.brandIcon192 || branding?.brandLogoUrl;
      const brand = branding && (brandName !== VIKING_NAME || hasIcons);

      if (!coachId || !brand) {
        if (blobUrlRef.current) {
          try { URL.revokeObjectURL(blobUrlRef.current); } catch {}
          blobUrlRef.current = null;
        }
        lastJsonRef.current = "";
        applyVikingDefaults(manifestLink);
        return;
      }

      const appleLink = el<HTMLLinkElement>("pwa-apple-icon");
      if (appleLink) appleLink.href = branding!.brandIcon180 ?? branding!.brandLogoUrl ?? "/app-icon.png";

      const title = el<HTMLMetaElement>("pwa-apple-title");
      if (title) title.content = brandName;
      const appName = el<HTMLMetaElement>("pwa-app-name");
      if (appName) appName.content = brandName;
      if (document.title !== brandName) document.title = brandName;

      const theme = branding!.brandColor ? branding!.brandColor : DEFAULT_THEME;
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute("content", theme);

      if (!manifestLink) return;

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

      const json = JSON.stringify(manifest);
      if (json === lastJsonRef.current) return;
      if (blobUrlRef.current) {
        try { URL.revokeObjectURL(blobUrlRef.current); } catch {}
        blobUrlRef.current = null;
      }
      lastJsonRef.current = json;
      const blob = new Blob([json], { type: "application/manifest+json" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      manifestLink.href = url;
    };

    apply();
  }, [branding, coachId, tick]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}