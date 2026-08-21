"use client";
import { useState, useEffect, useRef } from "react";
import { onAuthReady } from "@/lib/splash-ready";

const SPLASH_KEY = "__viking_splash";

function needsSplash() {
  if (typeof window === "undefined") return false;
  return !sessionStorage.getItem(SPLASH_KEY);
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
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
          src="/Viking.png"
          alt="Viking"
          style={{
            width: 96,
            height: 96,
            objectFit: "contain",
            animation: "splashLogo 0.4s ease-out 0.15s both, splashPulse 0.15s ease-in-out 0.55s 1",
          }}
        />
        <span
          style={{
            marginTop: 16,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 6,
            color: "rgba(255,255,255,0.85)",
            animation: "splashText 0.2s ease-out 0.35s both",
          }}
        >
          VIKING
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
