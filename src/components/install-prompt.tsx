"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

type Tab = "iphone" | "android";

export default function InstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("iphone");

  useEffect(() => {
    const isLanding = pathname === "/" || pathname === "/login";
    if (isLanding && isMobile() && !isStandalone()) {
      setVisible(true);
      if (isAndroid()) setTab("android");
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.1] hover:border-accent/30 transition-all shadow-2xl text-sm font-medium animate-fade-in"
      >
        <span>📲</span> Instalar App
      </button>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl p-6 shadow-2xl animate-fade-in max-h-[90dvh] overflow-y-auto">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-white/20 hover:text-white/60 text-xl leading-none">&times;</button>

            <div className="flex items-center gap-1.5 mb-5 p-1 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
              {(["iphone", "android"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                    tab === t ? "bg-accent/15 text-accent border border-accent/30" : "text-white/50 hover:text-white"
                  }`}
                >
                  {t === "iphone" ? "iPhone" : "Android"}
                </button>
              ))}
            </div>

            {tab === "iphone" ? (
              <>
                <h2 className="text-lg font-bold text-white mb-5 text-center">Instalar Viking en tu iPhone</h2>

                <div className="flex justify-center mb-6">
                  <div className="relative w-48 h-[380px] rounded-[2.5rem] border-[6px] border-black bg-black overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[22px] bg-black rounded-b-2xl z-10" />
                    <div className="m-0.5 rounded-[2.1rem] overflow-hidden bg-white/5">
                      <video
                        src="/videos/install-iphone.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[118px] h-[4px] rounded-full bg-white/40" />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { num: "1️⃣", text: 'Tocar "..."' },
                    { num: "2️⃣", text: 'Tocar "Compartir"' },
                    { num: "3️⃣", text: 'Tocar "Agregar a pantalla de inicio"' },
                    { num: "4️⃣", text: 'Tocar "Agregar"' },
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-3 text-sm text-white/70">
                      <span className="text-base">{step.num}</span>
                      <span>{step.text}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-5 text-center">Instalar Viking en tu Android</h2>

                <div className="flex justify-center mb-6">
                  <div className="relative w-48 h-[380px] rounded-[2.5rem] border-[6px] border-black bg-black overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-[22px] bg-black rounded-b-2xl z-10" />
                    <div className="m-0.5 overflow-hidden bg-white/5">
                      <video
                        src="/videos/install-android.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { num: "1️⃣", text: 'Presioná "..."' },
                    { num: "2️⃣", text: 'Presioná "Agregar a pantalla de inicio"' },
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-3 text-sm text-white/70">
                      <span className="text-base">{step.num}</span>
                      <span>{step.text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setModalOpen(false)}
              className="w-full btn-primary text-center"
            >
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}