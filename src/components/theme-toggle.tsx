"use client";

import { useEffect, useState } from "react";
import { esPilotoTemaClaro } from "@/lib/theme";

/** Switch sol/luna del modo claro. */
export function ThemeToggle({
  light,
  onToggle,
  className = "",
}: {
  light: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={light ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={light ? "Modo oscuro" : "Modo claro"}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 ${
        light ? "border-accent/40 bg-accent/25" : "border-white/[0.12] bg-white/[0.08]"
      } ${className}`}
    >
      <span className={`absolute left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0f1419] shadow transition-transform duration-300 ${
        light ? "translate-x-5" : "translate-x-0"
      }`}>
        {light ? (
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>
    </button>
  );
}

/** Aplica el tema también a la raíz (html) y a la barra del navegador móvil. */
export function applyThemeMode(light: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", light ? "light" : "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", light ? "#F4F6F8" : "#0A0A0B");
}

/**
 * Piloto de modo claro: solo se activa para los emails allow-listed.
 * Persiste la preferencia en localStorage y la aplica sobre <html>.
 */
export function usePilotTheme(email?: string | null) {
  const enabled = esPilotoTemaClaro(email);
  const [light, setLight] = useState(false);

  useEffect(() => {
    if (!enabled) {
      const meta = document.querySelector('meta[name="theme-color"]');
      document.documentElement.removeAttribute("data-theme");
      if (meta) meta.setAttribute("content", "#0A0A0B");
      return;
    }
    let stored: string | null = null;
    try { stored = localStorage.getItem("viking_theme"); } catch {}
    const on = stored === "light";
    setLight(on);
    applyThemeMode(on);
  }, [enabled]);

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-theme");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#0A0A0B");
    };
  }, []);

  const toggle = () => {
    setLight((prev) => {
      const next = !prev;
      try { localStorage.setItem("viking_theme", next ? "light" : "dark"); } catch {}
      applyThemeMode(next);
      return next;
    });
  };

  return { enabled, light, toggle };
}
