"use client";
import { useState, useEffect, useRef } from "react";
import { onAuthReady } from "@/lib/splash-ready";
import { useStudentBranding } from "@/lib/use-student-branding";

const SPLASH_KEY = "__viking_splash";

function needsSplash() {
  if (typeof window === "undefined") return false;
  return !sessionStorage.getItem(SPLASH_KEY);
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const { branding } = useStudentBranding();
  const [visible, setVisible] = useState(needsSplash);
  const [fading, setFading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    let authDone = false;
    let timerDone = false;
    let fadeTimer: ReturnType<typeof setTimeout>;

    const tryDismiss = () => {
      if (authDone && timerDone) {
        sessionStorage.setItem(SPLASH_KEY, "1");
        setFading(true);
        fadeTimer = setTimeout(() => setVisible(false), 300);
      }
    };

    onAuthReady(() => { authDone = true; tryDismiss(); });
    const minTimer = setTimeout(() => { timerDone = true; tryDismiss(); }, 1000);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(fadeTimer);
    };
  }, [visible]);

  if (!visible) return <>{children}</>;

  const brandName = branding?.brandName?.trim();
  const brandLogoUrl = branding?.brandLogoUrl?.trim();
  const branded = branding && (brandName || brandLogoUrl);
  const name = brandName ? brandName.toUpperCase() : "VIKING";
  const logoSrc = brandLogoUrl ?? "/Viking.png";
  const color = branded && branding.brandColor ? branding.brandColor : "rgba(255,255,255,0.85)";
  const circleLogo = branded && branding.brandLogoShape === "circle";

  return (
    <>
      {children}
      <div
        ref={ref}
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
    </>
  );
}