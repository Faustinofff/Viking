"use client";
import { useState, useEffect } from "react";

const SPLASH_KEY = "__viking_splash";

function needsSplash() {
  if (typeof window === "undefined") return false;
  return !sessionStorage.getItem(SPLASH_KEY);
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(needsSplash);
  const [ready, setReady] = useState(!needsSplash);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      setShow(false);
      setReady(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [show]);

  if (show) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0A0A0B",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: "splashFadeOut 0.3s ease-out 0.7s forwards",
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
          @keyframes splashFadeOut {
            to { opacity: 0; pointer-events: none; }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
