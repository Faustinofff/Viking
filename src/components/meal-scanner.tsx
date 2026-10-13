"use client";
import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import MealScanModal from "./meal-scan-modal";

export default function MealScanner({ email }: { email?: string | null }) {
  const [abierto, setAbierto] = useState(false);

  if ((email ?? "").toLowerCase() !== "pruebachequeo430@gmail.com") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="card-hover w-full flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
            Escanear comida <span className="badge-green text-[10px]">Beta</span>
          </p>
          <p className="text-xs text-white/40">Sacá una foto y obtené los macros</p>
        </div>
        <Sparkles className="w-4 h-4 text-white/30" />
      </button>

      {abierto && <MealScanModal onCerrar={() => setAbierto(false)} />}
    </>
  );
}
