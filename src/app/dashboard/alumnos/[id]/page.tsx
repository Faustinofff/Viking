"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getCoachCompletionsBatch, getWaterToday } from "@/lib/data";

export default function AlumnoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const alumno = useAppStore((s) => s.alumnos.find((a) => a.id === id));
  const getRutinasAlumno = useAppStore((s) => s.getRutinasAlumno);
  const getPlanesAlumno = useAppStore((s) => s.getPlanesAlumno);
  const registrarPeso = useAppStore((s) => s.registrarPeso);
  const registrosAgua = useAppStore((s) => s.registrosAgua);
  const actualizarApodoAlumno = useAppStore((s) => s.actualizarApodoAlumno);
  const registrosPeso = useAppStore((s) => s.registrosPeso.filter((r) => r.alumnoId === id));
  const sesionesEntreno = useAppStore((s) => s.sesionesEntreno.filter((se) => se.alumnoId === id));
  const actividades = useAppStore((s) => s.actividades.filter((a) => a.alumnoId === id && a.tipo !== "agua"));
  const coaches = useAppStore((s) => s.coaches);
  const [showPesoModal, setShowPesoModal] = useState(false);
  const [nuevoPeso, setNuevoPeso] = useState("");
  const [editandoApodo, setEditandoApodo] = useState(false);
  const [apodoInput, setApodoInput] = useState("");
  const [weeklyCompletions, setWeeklyCompletions] = useState<Record<string, boolean>>({});
  const [aguaHoy, setAguaHoy] = useState(0);

  const rutinasAlumno = getRutinasAlumno(alumno?.id ?? "");
  const planesAlumno = getPlanesAlumno(alumno?.id ?? "");

  useEffect(() => {
    if (!alumno?.id) return;
    const load = async () => {
      const comps = await getCoachCompletionsBatch(alumno.id);
      setWeeklyCompletions(comps);
      try { const a = await getWaterToday(alumno.id); setAguaHoy(a); } catch {}
    };
    load();
    // Poll activities + completions every 10s for cross-machine updates
    const pollActivities = async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/activities", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { activities: apiActivities } = await res.json();
          if (apiActivities?.length > 0) {
            useAppStore.setState((state) => {
              const existingIds = new Set(state.actividades.map((a) => a.id));
              const newOnes = apiActivities.filter((a: any) => !existingIds.has(a.id));
              if (newOnes.length > 0) {
                const merged = [...state.actividades, ...newOnes]
                  .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 50);
                return { actividades: merged };
              }
              return state;
            });
          }
        }
      } catch {}
      // Also refresh completions
      try {
        const { getCoachCompletionsBatch } = await import("@/lib/data");
        const comps = await getCoachCompletionsBatch(alumno!.id);
        if (Object.keys(comps).length > 0) setWeeklyCompletions(comps);
      } catch {}
    };
    const interval = setInterval(pollActivities, 10000);
    return () => clearInterval(interval);
  }, [alumno?.id, rutinasAlumno.length]);

  if (!alumno) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/40 mb-4">Alumno no encontrado</p>
        <Link href="/dashboard/alumnos" className="btn-primary">Volver</Link>
      </div>
    );
  }

  const hoyStr = new Date().toISOString().split("T")[0];
  const aguaStore = registrosAgua
    .filter((r) => r.alumnoId === alumno.id && r.fecha === hoyStr)
    .reduce((s, r) => s + r.vasos, 0);
  const aguaHoyFinal = aguaHoy > 0 ? aguaHoy : aguaStore;
  const pesoAnterior = alumno.ultimoPesoRegistrado;
  const diferenciaPeso = pesoAnterior ? (alumno.peso - pesoAnterior).toFixed(1) : null;
  const totalDiasSemana = rutinasAlumno.reduce((s, r) => s + r.dias.length, 0);
  const diasCompletados = Object.values(weeklyCompletions).filter(Boolean).length;
  const adherencePct = totalDiasSemana > 0 ? Math.round((diasCompletados / totalDiasSemana) * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard/alumnos" className="text-sm text-white/30 hover:text-white/50">← Todos los alumnos</Link>
        <div className="flex flex-col sm:flex-row items-start justify-between mt-2 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-accent/15 flex items-center justify-center text-xl sm:text-2xl font-bold text-accent">{alumno.nombre[0]}</div>
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white">{alumno.apodo || alumno.nombre}</h1>
              <p className="text-white/40 text-sm sm:text-base mt-1">{alumno.email} · {alumno.edad} años</p>
            </div>
            <button onClick={() => { setApodoInput(alumno.apodo ?? ""); setEditandoApodo(true); }} className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 text-xs !px-2.5 !py-1 rounded-lg shrink-0 font-medium" title="Cambiar apodo">✏️ Apodo</button>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {alumno.telefono && (
              <a href={`https://wa.me/${alumno.telefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hola ${alumno.nombre}, soy tu coach de Viking Fit`)}`}
                target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs sm:text-sm flex items-center gap-1 flex-1 sm:flex-none justify-center">
                <span>💬</span> WhatsApp
              </a>
            )}
            <Link href={`/dashboard/rutinas?alumnoId=${alumno.id}`} className="btn-secondary text-xs sm:text-sm flex-1 sm:flex-none text-center">Asignar Rutina</Link>
            <Link href={`/dashboard/nutricion?alumnoId=${alumno.id}`} className="btn-secondary text-xs sm:text-sm flex-1 sm:flex-none text-center">Plan Nutricional</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-white/40">Peso Actual</p>
          <p className="text-2xl font-bold text-white mt-1">{alumno.peso} kg</p>
          {diferenciaPeso && (
            <p className={`text-xs mt-1 ${parseFloat(diferenciaPeso) < 0 ? "text-accent" : "text-yellow-500"}`}>
              {parseFloat(diferenciaPeso) < 0 ? `▼ ${Math.abs(parseFloat(diferenciaPeso))} kg` : `▲ ${diferenciaPeso} kg`}
            </p>
          )}
          <button onClick={() => setShowPesoModal(true)} className="btn-ghost text-xs mt-2 !px-0">Actualizar</button>
        </div>
        <div className="card">
          <p className="text-xs text-white/40">Objetivo</p>
          <p className="text-lg font-bold text-white mt-1 capitalize">{alumno.objetivo}</p>
          <p className="text-xs text-white/30 mt-1">{alumno.plan === "solo_rutina" ? "Solo Rutina" : alumno.plan === "rutina_nutricion" ? "Rutina + Nutrición" : "Acompañamiento Total"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-white/40">Agua Hoy</p>
          <p className="text-2xl font-bold text-white mt-1">{aguaHoyFinal}/8 <span className="text-base font-normal text-white/40">vasos</span></p>
          <p className="text-xs text-white/30 mt-1">{aguaHoyFinal >= 8 ? "✅ Meta cumplida" : `${8 - aguaHoyFinal} vasos restantes`}</p>
        </div>
        <div className="card">
          <p className="text-xs text-white/40">Esta Semana</p>
          <p className="text-2xl font-bold text-white mt-1">{diasCompletados}/{totalDiasSemana}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${adherencePct}%` }} />
            </div>
            <span className="text-xs text-white/40">{adherencePct}%</span>
          </div>
          <p className="text-xs text-white/30 mt-1">{totalDiasSemana > 0 ? `${diasCompletados}/${totalDiasSemana} días completados` : "Sin rutina asignada"}</p>
        </div>
      </div>

      {/* Rutinas + Nutrición */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rutinas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Rutinas Asignadas</h2>
            <Link href={`/dashboard/rutinas?alumnoId=${alumno.id}`} className="btn-ghost text-xs">+ Nueva</Link>
          </div>
          {rutinasAlumno.length > 0 ? (
            <div className="space-y-4">
              {rutinasAlumno.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-accent">{r.nombre}</p>
                    <Link href={`/dashboard/rutinas?alumnoId=${alumno.id}&editRutinaId=${r.id}`} className="btn-ghost text-xs">Editar</Link>
                  </div>
                  {r.dias.map((dia) => (
                    <div key={dia.id} className={`glass rounded-xl p-3 border mb-2 ${weeklyCompletions[dia.id] ? "border-accent/20 bg-accent/[0.03]" : "border-white/[0.06]"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">{dia.nombre} · {dia.diaSemana}</p>
                        {weeklyCompletions[dia.id] && <span className="text-[10px] text-accent font-semibold">✓ Completado</span>}
                      </div>
                      <div className="space-y-1.5">
                        {dia.ejercicios.map((ej) => (
                          <div key={ej.id} className="flex items-center justify-between text-sm">
                            <span className="text-white/80">{ej.ejercicioNombre}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-white/40 text-xs">{ej.series}×{ej.reps} · {ej.descansoSegundos}s</span>
                              {ej.videoUrl && <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer" className="bg-accent/10 text-accent font-medium rounded-lg px-2 py-1 text-[10px] hover:bg-accent/20 transition-all border border-accent/20">Tutorial</a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 text-center py-8">Sin rutinas asignadas aún</p>
          )}
        </div>

        {/* Plan Nutricional */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Planes Nutricionales</h2>
            <Link href={`/dashboard/nutricion?alumnoId=${alumno.id}`} className="btn-ghost text-xs">+ Nuevo</Link>
          </div>
          {planesAlumno.length > 0 ? (
            <div className="space-y-4">
              {planesAlumno.map((plan) => (
                <div key={plan.id}>
                  <p className="text-sm font-medium text-accent mb-3">{plan.nombre}</p>
                  {plan.dias.slice(0, 5).map((dia) => (
                    <div key={dia.id} className="glass rounded-xl p-3 border border-white/[0.06] mb-2">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 capitalize">{dia.diaSemana}</p>
                      {dia.comidas.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 text-sm py-1">
                          <span className="text-white/40 text-xs w-16 flex-shrink-0">{c.tipo}</span>
                          <span className="text-white/70">{c.alimentos.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30 text-center py-8">Sin planes nutricionales asignados</p>
          )}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Actividad</h2>
        <div className="space-y-3">
          {actividades.slice(0, 8).map((act) => (
            <div key={act.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                act.tipo === "peso" ? "bg-blue-500/10" : act.tipo === "entreno" ? "bg-accent/10" : "bg-yellow-500/10"
              }`}>
                {act.tipo === "peso" ? "⚖️" : act.tipo === "entreno" ? "💪" : "🏆"}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/70">{act.mensaje}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  {new Date(act.timestamp).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {actividades.length === 0 && (
            <p className="text-sm text-white/30 text-center py-4">Sin actividad registrada</p>
          )}
        </div>
      </div>

      {/* Modal Peso */}
      {showPesoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowPesoModal(false)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Actualizar Peso</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (nuevoPeso) { registrarPeso(alumno.id, parseFloat(nuevoPeso)); setShowPesoModal(false); setNuevoPeso(""); } }} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Nuevo peso (kg)</label>
                <input type="number" step="0.1" className="input" placeholder="75" value={nuevoPeso} onChange={(e) => setNuevoPeso(e.target.value)} required autoFocus />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPesoModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Apodo */}
      {editandoApodo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setEditandoApodo(false)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Editar apodo</h2>
            <form onSubmit={(e) => { e.preventDefault(); actualizarApodoAlumno(alumno.id, apodoInput.trim()); setEditandoApodo(false); }} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Apodo</label>
                <input className="input" placeholder="Cómo querés llamarlo" value={apodoInput} onChange={(e) => setApodoInput(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditandoApodo(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
