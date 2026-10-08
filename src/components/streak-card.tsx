"use client";
import { Flame } from "lucide-react";
import type { StreakDay } from "@/lib/streak";

export default function StreakCard({ streak, days }: { streak: number; days: StreakDay[] }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" strokeWidth={2} />
        <p className="text-white font-bold text-base">
          {streak} {streak === 1 ? "día" : "días"} de racha
        </p>
      </div>

      <div className="flex items-center justify-between">
        {days.map((d) => (
          <div key={d.key} className="flex flex-col items-center gap-1.5">
            <span
              className={
                d.trained
                  ? "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-cyan-400 text-bg-primary shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                  : `w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border ${
                      d.isToday ? "border-cyan-400 text-cyan-400" : "border-cyan-400/40 text-white/40"
                    }`
              }
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
