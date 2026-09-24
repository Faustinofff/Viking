"use client";
import { useEffect, useState } from "react";
import { useStudentBranding } from "@/lib/use-student-branding";

const VIKING_NAME = "Viking";
const VIKING_TITLE = "Viking — Plataforma de Entrenamiento";
const DEFAULT_THEME = "#0a0a0a";

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function applyVikingDefaults() {
  const appleLink = el<HTMLLinkElement>("pwa-apple-icon");
  if (appleLink) appleLink.href = "/app-icon.png";
  const title = el<HTMLMetaElement>("pwa-apple-title");
  if (title) title.content = VIKING_NAME;
  const appName = el<HTMLMetaElement>("pwa-app-name");
  if (appName) appName.content = VIKING_NAME;
  if (document.title !== VIKING_TITLE) document.title = VIKING_TITLE;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", DEFAULT_THEME);
}

/** Aplica el branding del coach a la identidad PWA (íconos y títulos).
 * El manifest.name/short_name lo sirve el servidor (/api/pwa-manifest)
 * según la cookie, para que iOS/Android tomen el nombre de la marca.
 * Fallback completo: Viking. */
export default function DynamicPwaHead() {
  const { branding, coachId } = useStudentBranding();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const apply = () => {
      const brandName = branding?.brandName?.trim() || VIKING_NAME;
      const hasIcons = branding?.brandIcon512 || branding?.brandIcon192 || branding?.brandLogoUrl;
      const brand = branding && (brandName !== VIKING_NAME || hasIcons);

      if (!coachId || !brand) {
        applyVikingDefaults();
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