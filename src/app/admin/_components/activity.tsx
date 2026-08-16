"use client";
import type { AdminEvent, ActivityType } from "@/lib/admin-types";
import { ACTIVITY_CATEGORY_MAP, activityGroup } from "@/lib/admin-types";
import { timeAgo } from "./ui";

const GROUP_STYLES: Record<string, { icon: string; cls: string }> = {
  login: { icon: "→", cls: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  alumnos: { icon: "👤", cls: "bg-green-500/15 text-green-400 border border-green-500/20" },
  rutinas: { icon: "📋", cls: "bg-purple-500/15 text-purple-400 border border-purple-500/20" },
  nutricion: { icon: "🍎", cls: "bg-orange-500/15 text-orange-400 border border-orange-500/20" },
  ia: { icon: "🤖", cls: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" },
  exportaciones: { icon: "📤", cls: "bg-pink-500/15 text-pink-400 border border-pink-500/20" },
  configuracion: { icon: "⚙️", cls: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" },
  otras: { icon: "•", cls: "bg-white/[0.06] text-white/50 border border-white/10" },
};

export function groupStyle(type: string): { icon: string; cls: string } {
  return GROUP_STYLES[activityGroup(type as any)] ?? GROUP_STYLES.otras;
}

export function ActivityBadge({ type }: { type: string }) {
  const style = groupStyle(type);
  const label = ACTIVITY_CATEGORY_MAP[type as ActivityType]?.label ?? "Acción";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${style.cls}`}>
      <span className="text-[10px] leading-none">{style.icon}</span>
      {label}
    </span>
  );
}

export function formatEventTime(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ActivityRow({ event, showActor = false }: { event: AdminEvent; showActor?: boolean }) {
  const style = groupStyle(event.type);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${style.cls}`}>
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80 leading-snug">
          {showActor && event.actorName && (
            <span className="font-semibold text-white">{event.actorName} </span>
          )}
          {event.message}
        </p>
        <p className="text-[11px] text-white/35 mt-0.5">
          {formatEventTime(event.ts)} · {timeAgo(event.ts)}
        </p>
      </div>
      <ActivityBadge type={event.type} />
    </div>
  );
}

export function ActivityFeed({ events, showActor = false, emptyText = "Sin actividad registrada" }: { events: AdminEvent[]; showActor?: boolean; emptyText?: string }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 text-white/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-white/50">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/[0.04]">
      {events.map((e) => (
        <ActivityRow key={e.id} event={e} showActor={showActor} />
      ))}
    </div>
  );
}
