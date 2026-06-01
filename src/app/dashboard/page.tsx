"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

function SubscriptionWidget() {
  const premium = useAppStore((s) => s.premium);
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    if (!premium) return;
    const exp = new Date(premium.premiumExpiresAt);
    const ahora = new Date();
    const diff = Math.ceil((exp.getTime() - ahora.getTime()) / 86400000);
    setDiasRestantes(diff);
    setActivo(diff > 0);
  }, [premium]);

  if (!premium) return null;

  const expiracion = new Date(premium.premiumExpiresAt);
  const porVencer = activo && diasRestantes <= 7;

  return (
    <div className={`card border ${activo ? "border-accent/20 bg-accent/5" : "border-red-500/20 bg-red-500/5"}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Suscripción</p>
          {activo ? (
            <>
              <p className="text-lg font-bold text-white mt-1">Plan {premium.planName}</p>
              <p className="text-xs text-white/50">
                Vence: {expiracion.toLocaleDateString("es-AR")} · {diasRestantes} días restantes
              </p>
              {porVencer && <p className="text-xs text-yellow-400 mt-1">⚠ Renová pronto para no perder el acceso premium</p>}
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-red-400 mt-1">Suscripción vencida</p>
              <p className="text-xs text-white/50">Vencido el {expiracion.toLocaleDateString("es-AR")}</p>
            </>
          )}
        </div>
        <Link
          href="/dashboard/planes-premium"
          className={`shrink-0 text-sm font-medium px-4 py-2 rounded-xl transition-all text-white border ${
            activo
              ? "border-accent/30 hover:bg-accent/10 hover:border-accent/50"
              : "border-accent bg-accent text-bg-primary hover:bg-accent/90"
          }`}
        >
          {activo ? "Gestionar plan" : "Ver planes"}
        </Link>
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const alumnos = useAppStore((s) => s.alumnos);
  const redes = useAppStore((s) => s.redes);
  const agenda = useAppStore((s) => s.agenda);
  const rawActividades = useAppStore((s) => s.actividades);
  const actividades = rawActividades.filter((a) => a.tipo !== "agua");

  useEffect(() => { useAppStore.getState().syncCoachData(); }, []);

  const totalAlumnos = alumnos.length;
  const totalRedes = redes.length;
  const sesionesHoy = agenda.filter((s) => {
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const hoy = dias[new Date().getDay()];
    return s.diaSemana === hoy;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-white/40 mt-1 text-xs md:text-sm">Bienvenido de vuelta. Este es tu resumen.</p>
        </div>
        <Link href="/dashboard/rutinas" className="btn-primary text-xs md:text-sm shrink-0">+ Nueva Rutina</Link>
      </div>

      {/* Premium Widget */}
      <SubscriptionWidget />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Alumnos", value: totalAlumnos, change: "totales", color: "text-accent" },
          { label: "Redes", value: totalRedes, change: "grupos", color: "text-blue-400" },
          { label: "Sesiones Hoy", value: sesionesHoy.length, change: "programadas", color: "text-yellow-500" },
          { label: "Adherencia Prom.", value: "87%", change: "+5% este mes", color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/30 mt-1">{s.change}</p>
          </div>
        ))}
      </div>

      {/* Redes + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Tus Redes</h2>
            <Link href="/dashboard/redes" className="text-xs text-accent hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {redes.map((red) => (
              <Link key={red.id} href={`/dashboard/redes/${red.id}`} className="flex items-center gap-4 p-4 glass rounded-xl hover:bg-white/[0.02] transition-all border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-lg">
                  {red.tipo === "gimnasio" ? "🏋️" : "💻"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{red.nombre}</p>
                  <p className="text-xs text-white/40">{red.tipo === "gimnasio" ? "Presencial" : "Online"} · {red.alumnoIds.length} alumnos</p>
                </div>
                <span className="text-white/20">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Actividad */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            {actividades.slice(0, 6).map((act) => (
              <div key={act.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                  act.tipo === "peso" ? "bg-blue-500/10" :
                  act.tipo === "entreno" ? "bg-accent/10" : "bg-yellow-500/10"
                }`}>
                  {act.tipo === "peso" ? "⚖️" : act.tipo === "entreno" ? "💪" : "🏆"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80">
                    <span className="font-medium text-white">{act.alumnoNombre}</span>{" "}
                    {act.mensaje}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(act.timestamp).toLocaleDateString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agenda Hoy */}
      {sesionesHoy.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Agenda de Hoy</h2>
          <div className="space-y-3">
            {sesionesHoy.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 glass rounded-xl border border-white/[0.06]">
                <div className="text-sm font-mono text-accent font-medium w-14">{s.hora}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{s.titulo}</p>
                  <p className="text-xs text-white/40">{s.grupoMuscular}</p>
                </div>
                <div className="flex -space-x-2">
                  {s.alumnoIds.map((aid) => {
                    const a = alumnos.find((al) => al.id === aid);
                    return (
                      <div key={aid} className="w-8 h-8 rounded-full bg-white/[0.08] border-2 border-bg-secondary flex items-center justify-center text-xs font-medium text-white/60">
                        {a?.nombre[0] ?? "?"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
