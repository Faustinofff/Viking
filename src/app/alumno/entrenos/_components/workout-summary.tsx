"use client";
import { useEffect, useState } from "react";

interface WorkoutSummaryProps {
  diaNombre: string;
  rutinaNombre: string;
  startedAt: string;
  completedSets: number;
  totalSets: number;
  volumenTotal: number;
  ejerciciosCompletados: number;
  totalEjercicios: number;
  onBack: () => void;
}

function formatDuration(startedAt: string, now: number): string {
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return "00:00";
  const total = Math.max(0, Math.floor((now - start) / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function SemicircularGauge({ percent }: { percent: number }) {
  const [animated, setAnimated] = useState(0);
  const pct = Math.max(0, Math.min(100, percent));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="relative w-56 mx-auto">
      <svg viewBox="0 0 200 118" className="w-full">
        <path
          d="M 20 114 A 80 80 0 0 1 180 114"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M 20 114 A 80 80 0 0 1 180 114"
          fill="none"
          stroke="#00D4AA"
          strokeWidth="13"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={100 - animated}
          style={{ transition: "stroke-dashoffset 1.2s ease-out", filter: "drop-shadow(0 0 6px rgba(0,212,170,0.45))" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-4xl font-extrabold text-white">{Math.round(pct)}<span className="text-2xl text-accent">%</span></p>
        <p className="text-[11px] text-white/40 uppercase tracking-widest mt-0.5">Sesión completada</p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "accent" | "green" | "blue" | "yellow" }) {
  const toneColor =
    tone === "green" ? "text-green-400" : tone === "blue" ? "text-blue-400" : tone === "yellow" ? "text-yellow-400" : "text-accent";
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-1">{label}</p>
      <p className={`text-xl font-bold ${toneColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function WorkoutSummary({
  diaNombre,
  rutinaNombre,
  startedAt,
  completedSets,
  totalSets,
  volumenTotal,
  ejerciciosCompletados,
  totalEjercicios,
  onBack,
}: WorkoutSummaryProps) {
  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="card-glow text-center py-8 space-y-5 overflow-hidden relative">
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-40 bg-accent/20 blur-[80px] rounded-full" />
        <div className="relative">
          <p className="text-4xl mb-1">💪</p>
          <p className="text-xl font-bold text-white">Entreno completado</p>
          <p className="text-xs text-white/40 mt-1">{diaNombre} · {rutinaNombre}</p>
        </div>

        <SemicircularGauge percent={totalSets > 0 ? (completedSets / totalSets) * 100 : 0} />

        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Tiempo total" value={formatDuration(startedAt, now)} sub="min:seg" tone="accent" />
          <Stat label="Ejercicios" value={`${ejerciciosCompletados}/${totalEjercicios}`} sub="completados" tone="green" />
          <Stat label="Peso total" value={volumenTotal > 0 ? `${volumenTotal > 999 ? (volumenTotal / 1000).toFixed(1).replace(".", ",") + "k" : volumenTotal}` : "—"} sub="volumen kg" tone="blue" />
        </div>
      </div>

      <button onClick={onBack} className="btn-primary w-full py-3">
        Volver a entrenos
      </button>
    </div>
  );
}