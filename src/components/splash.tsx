"use client";
import { useState, useEffect } from "react";
import { onAuthReady, isAuthReady } from "@/lib/splash-ready";
import { useStudentBranding } from "@/lib/use-student-branding";

const SPLASH_KEY = "__viking_splash";
const LOGO_HOLD_MS = 700;
const FADE_MS = 300;
const BRAND_RESOLVE_TIMEOUT = 2500;

function needsSplash() {
  if (typeof window === "undefined") return false;
  try { return !sessionStorage.getItem(SPLASH_KEY); } catch { return true; }
}

/** Única capa de inicialización: mientras está activa NO se monta nada de la
 *  aplicación (ni Login ni App). El logo se resuelve ANTES de mostrarse:
 *  la marca del coach si hay branding, Viking sólo cuando se confirmó que no
 *  hay ninguna. Nunca Viking seguido de un cambio a la marca. */
export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const { branding, resolved } = useStudentBranding();
  const [coldStart] = useState(needsSplash);
  const [authReady, setAuthReady] = useState(isAuthReady);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(() => !needsSplash() && isAuthReady());
  const [forceLogo, setForceLogo] = useState(false);
  const [forceDone, setForceDone] = useState(false);

  // Si el branding tarda demasiado, se cae a Viking y queda fijo: la marca que
  // llegue después no provoca ningún swap visible dentro del splash.
  const effectiveBranding = forceLogo ? null : branding;
  const brandName = effectiveBranding?.brandName?.trim();
  const brandLogoUrl = effectiveBranding?.brandLogoUrl?.trim();
  const branded = effectiveBranding && (brandName || brandLogoUrl);
  // Se muestra el logo recién cuando la marca es definitiva: branding presente
  // (cache o fetch) o resuelto que no hay ninguna. Antes: fondo neutro.
  const showLogo = effectiveBranding != null || resolved || forceLogo;

  useEffect(() => {
    if (authReady) return;
    onAuthReady(() => setAuthReady(true));
  }, [authReady]);

  // Red de seguridad del branding: nunca muestra Viking seguido de un swap.
  useEffect(() => {
    if (showLogo) return;
    const t = setTimeout(() => setForceLogo(true), BRAND_RESOLVE_TIMEOUT);
    return () => clearTimeout(t);
  }, [showLogo]);

  // Red de seguridad global: el splash jamás queda colgado.
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setForceDone(true), 6000);
    return () => clearTimeout(t);
  }, [done]);

  useEffect(() => {
    if (done) return;

    if (forceDone) {
      setFading(true);
      const t = setTimeout(() => setDone(true), FADE_MS);
      return () => clearTimeout(t);
    }

    if (!coldStart) {
      // Vuelta en caliente / reload: solo esperar auth; sin animación extra.
      if (!authReady) return;
      setFading(true);
      const t = setTimeout(() => setDone(true), FADE_MS);
      return () => clearTimeout(t);
    }

    // Primera apertura: auth + marca resueltos → logo + animación → salida.
    if (!(authReady && showLogo)) return;
    const t1 = setTimeout(() => setFading(true), LOGO_HOLD_MS);
    const t2 = setTimeout(() => setDone(true), LOGO_HOLD_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [done, coldStart, authReady, showLogo, forceDone]);

  if (done) return <>{children}</>;

  const name = brandName ? brandName.toUpperCase() : "VIKING";
  const logoSrc = brandLogoUrl ?? "/Viking.png";
  const color = branded && effectiveBranding?.brandColor ? effectiveBranding.brandColor : "rgba(255,255,255,0.85)";
  const circleLogo = branded && effectiveBranding?.brandLogoShape === "circle";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0A0A0B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.3s ease-out",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {showLogo ? (
        <>
          <img
            src={logoSrc}
            alt={name}
            style={{
              width: 96,
              height: 96,
              objectFit: circleLogo ? "cover" : "contain",
              borderRadius: circleLogo ? 9999 : 18,
              backgroundColor: circleLogo ? undefined : "rgba(255,255,255,0.04)",
              animation: "splashLogo 0.4s ease-out 0.15s both, splashPulse 0.15s ease-in-out 0.55s 1",
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span
            style={{
              marginTop: 16,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: Math.min(22, Math.max(16, 44 - name.length)),
              fontWeight: 600,
              letterSpacing: 3,
              color,
              textAlign: "center",
              padding: "0 24px",
              animation: "splashText 0.2s ease-out 0.35s both",
            }}
          >
            {name}
          </span>
        </>
      ) : null}
      <style>{`
        @keyframes splashLogo {
          from { opacity: 0; transform: scale(0.85); filter: blur(4px); }
          to   { opacity: 1; transform: scale(1);   filter: blur(0); }
        }
        @keyframes splashText {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}