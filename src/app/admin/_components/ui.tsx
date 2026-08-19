"use client";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState, useEffect } from "react";
import type { PremiumInfo } from "@/lib/admin-types";

/* ─── Toast Context ─── */
interface Toast { id: string; message: string; tone: "success" | "error" | "info"; }
const ToastCtx = createContext<{ toast: (message: string, tone?: Toast["tone"]) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto cursor-pointer rounded-xl px-4 py-3 text-sm font-medium shadow-2xl border animate-fade-in transition-all ${
              t.tone === "success"
                ? "bg-green-500/15 text-green-400 border-green-500/25"
                : t.tone === "error"
                ? "bg-red-500/15 text-red-400 border-red-500/25"
                : "bg-accent/15 text-accent border-accent/25"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function timeAgo(date?: string | null): string {
  if (!date) return "—";
  const t = new Date(date).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? "hace 1 día" : `hace ${d} días`;
  return formatShort(date);
}

export function formatShort(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatFull(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function Avatar({ name, size = 36, className = "" }: { name?: string; size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-semibold text-accent flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

export function Badge({ children, tone = "gray", className = "" }: { children: ReactNode; tone?: "green" | "yellow" | "red" | "blue" | "purple" | "gray" | "cyan" | "orange"; className?: string }) {
  const tones: Record<string, string> = {
    green: "bg-green-500/15 text-green-400 border border-green-500/20",
    yellow: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
    red: "bg-red-500/15 text-red-400 border border-red-500/20",
    blue: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    purple: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
    cyan: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
    orange: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
    gray: "bg-white/[0.06] text-white/50 border border-white/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge tone="green">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Activo
      </Badge>
    );
  }
  if (status === "no_recent") {
    return (
      <Badge tone="yellow">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        Actividad baja
      </Badge>
    );
  }
  return (
    <Badge tone="gray">
      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
      Inactivo
    </Badge>
  );
}

export function PremiumBadge({ premium, isFree, daysLeft }: { premium?: PremiumInfo | null; isFree?: boolean; daysLeft?: number | null }) {
  if (isFree) return <Badge tone="purple">Gratuito</Badge>;
  if (!premium) return <Badge tone="gray">Sin Premium</Badge>;
  const active = daysLeft !== null && daysLeft !== undefined && daysLeft >= 0;
  if (active) return <Badge tone="yellow">Premium</Badge>;
  return <Badge tone="red">Vencido</Badge>;
}

export function EmptyState({ title, sub, icon }: { title: string; sub?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 text-white/30">
        {icon ?? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-white/60">{title}</p>
      {sub && <p className="text-xs text-white/30 mt-1 max-w-sm">{sub}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-red-500/20 bg-red-500/[0.04] p-4 text-sm text-red-400">
      Error al cargar los datos: {message}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, icon, tone, children, className = "" }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode; tone?: "green" | "yellow" | "red" | "blue" | "purple" | "cyan" | "orange" | "gray"; children: ReactNode; className?: string }) {
  const toneBorder: Record<string, string> = {
    green: "border-l-green-500/50",
    yellow: "border-l-yellow-500/50",
    red: "border-l-red-500/50",
    blue: "border-l-blue-500/50",
    purple: "border-l-purple-500/50",
    cyan: "border-l-cyan-500/50",
    orange: "border-l-orange-500/50",
    gray: "border-l-white/15",
  };
  return (
    <div className={`card p-4 md:p-5 ${tone ? `border-l-2 ${toneBorder[tone]}` : ""} ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
              {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, tone = "accent", onClick }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "accent" | "blue" | "green" | "yellow" | "red" | "purple" | "cyan" | "orange" | "gray"; onClick?: () => void }) {
  const tones: Record<string, string> = {
    accent: "text-accent",
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
    orange: "text-orange-400",
    gray: "text-white/50",
  };
  return (
    <div
      className={`card p-4 md:p-5 transition-all ${onClick ? "hover:bg-white/[0.07] cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-white/40 truncate">{label}</p>
        {icon && <span className={`flex-shrink-0 ${tones[tone]}`}>{icon}</span>}
      </div>
      <p className={`text-2xl md:text-[28px] font-bold mt-1.5 leading-none ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

export function Pill({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
        active
          ? "bg-accent/10 text-accent border-accent/25"
          : "bg-white/[0.03] text-white/40 hover:text-white/70 border-transparent hover:bg-white/[0.06]"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-white/40"}`}>{count}</span>
      )}
    </button>
  );
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-md" }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; maxWidth?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card w-full ${maxWidth} max-h-[85vh] overflow-y-auto animate-fade-in`}>
        {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function MiniStat({ label, value, tone = "text-white" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}

export function TimeAgo({ date, className = "" }: { date?: string | null; className?: string }) {
  return <span className={`whitespace-nowrap ${className}`} title={formatFull(date)}>{timeAgo(date)}</span>;
}
