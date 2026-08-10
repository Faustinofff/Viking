"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore, type Rutina } from "@/lib/store";
import { getStudentWorkoutPlans, getCompletionsBatch, getWeeksCompletadas, getStudentCurrentWeek, saveStudentCurrentWeek, ejercicioWeekValue, parseIndicacionesSemanales } from "@/lib/data";
import TutorialButton from "@/components/tutorial-button";

export default function StudentEntrenosPage() {
  const router = useRouter();
  const usuario = useAppStore((s) => s.usuarioActual);
  const sesionesEntreno = useAppStore((s) => s.sesionesEntreno);
  const currentWeek = useAppStore((s) => s.currentWeek);
  const loadCurrentWeek = useAppStore((s) => s.loadCurrentWeek);
  const setCurrentWeekStore = useAppStore((s) => s.setCurrentWeek);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [weeksCompletadas, setWeeksCompletadas] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [indicacionesModal, setIndicacionesModal] = useState<{ rutina: Rutina; dia: any } | null>(null);
  const [weekModalRuta, setWeekModalRuta] = useState<string | null>(null);
  const [weekModalDia, setWeekModalDia] = useState<string | null>(null);
  const [weekModalSelected, setWeekModalSelected] = useState<number>(1);

  useEffect(() => {
    if (!usuario?.id) return;
    const load = async () => {
      try {
        await loadCurrentWeek();
        const week = useAppStore.getState().currentWeek;
        const plans = await getStudentWorkoutPlans(usuario.id);
        const comps = await getCompletionsBatch(usuario.id, week ?? undefined);
        setCompletions(comps);
        getWeeksCompletadas(usuario.id).then(setWeeksCompletadas).catch(() => {});
        const DAY_ORDER: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
        const parsed: Rutina[] = plans.map((p: any) => {
          const dias = (p.workout_days ?? []).sort((a: any, b: any) => (DAY_ORDER[a.week_day] ?? 99) - (DAY_ORDER[b.week_day] ?? 99)).map((d: any) => {
            const ejercicios = (d.workout_exercises ?? []).map((we: any) => {
              let nombre = "", grupo = "", videoUrl = "", notas = we.notes ?? "";
              let seriesPorSemana = null, repsPorSemana = null, descansoPorSemana = null, notasPorSemana = null;
              if (typeof notas === "object" && notas !== null) {
                nombre = notas.n ?? ""; grupo = notas.g ?? ""; videoUrl = notas.v ?? "";
                seriesPorSemana = notas.sps ?? null; repsPorSemana = notas.rps ?? null;
                descansoPorSemana = notas.dps ?? null; notasPorSemana = notas.nps ?? null;
                notas = notas.c ?? "";
              } else {
                try { const m = JSON.parse(notas || "{}"); if (m.n) { nombre = m.n; grupo = m.g; videoUrl = m.v ?? ""; seriesPorSemana = m.sps ?? null; repsPorSemana = m.rps ?? null; descansoPorSemana = m.dps ?? null; notasPorSemana = m.nps ?? null; notas = m.c ?? ""; } } catch {}
              }
              return {
                id: we.id,
                ejercicioId: we.exercise_id,
                ejercicioNombre: nombre,
                grupoMuscular: grupo,
                series: (we.exercise_sets ?? []).length,
                reps: (we.exercise_sets ?? [])[0]?.reps ?? 0,
                descansoSegundos: (we.exercise_sets ?? [])[0]?.rest_seconds ?? 90,
                notas,
                videoUrl,
                seriesPorSemana,
                repsPorSemana,
                descansoPorSemana,
                notasPorSemana,
              };
            });
            return {
              id: d.id, nombre: d.day_name,
              diaSemana: d.week_day === "monday" ? "lunes" : d.week_day === "tuesday" ? "martes" : d.week_day === "wednesday" ? "miercoles" : d.week_day === "thursday" ? "jueves" : d.week_day === "friday" ? "viernes" : d.week_day === "saturday" ? "sabado" : "domingo",
              ejercicios,
            };
          });
          return {
            id: p.id, coachId: p.coach_id ?? "", nombre: p.name, descripcion: p.description ?? "",
            alumnoId: usuario.id, mes: 1, anio: 2026, activa: true, creadoEn: p.created_at,
            indicacionesSemanales: parseIndicacionesSemanales(p.description),
            dias,
          };
        });
        setRutinas(parsed);
      } catch (e) {
        console.error("Error loading workouts:", e);
      }
      setLoading(false);
    };
    load();
  }, [usuario?.id]);

  // Re-fetch completions when current week changes
  useEffect(() => {
    if (!usuario?.id || currentWeek === null || rutinas.length === 0) return;
    getCompletionsBatch(usuario.id, currentWeek).then(setCompletions).catch(() => {});
  }, [usuario?.id, currentWeek]);

  // Debug: log raw exercise data
  useEffect(() => {
    const totalEj = rutinas.reduce((s, r) => s + r.dias.reduce((s2, d) => s2 + d.ejercicios.length, 0), 0);
    console.log(`Rutinas: ${rutinas.length}, total ejercicios: ${totalEj}`);
    if (rutinas.length > 0) {
      console.log("Primera rutina:", JSON.stringify(rutinas[0], null, 2));
    }
  }, [rutinas]);

  if (!usuario) return null;
  const fullCompletions = completions;

  const sesionActiva = sesionesEntreno.find((s) =>
    s.alumnoId === usuario.id
    && !s.completada
    && s.series.some((ser) => !ser.completada)
    && !fullCompletions[s.diaRutinaId]
  );

  if (loading) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <div className="w-8 h-8 rounded-lg bg-accent animate-pulse mx-auto mb-4" />
      </div>
    );
  }

  if (rutinas.length === 0) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <p className="text-white/40 mb-2">Aún no tienes una rutina asignada</p>
        <p className="text-white/20 text-sm">Tu coach te asignará una rutina pronto.</p>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Mis Entrenos</h1>
        <p className="text-white/40 text-sm mt-0.5">{rutinas.length} rutina(s)</p>
      </div>

      {sesionActiva && (
        <div className="card-glow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider">Sesión en curso</p>
            <Link href={`/alumno/entrenos/activo?rutinaId=${sesionActiva.rutinaId}&diaId=${sesionActiva.diaRutinaId}`} className="btn-primary text-xs">Continuar →</Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-white/70">Entreno empezado</span>
          </div>
        </div>
      )}

      {rutinas.map((rutina) => (
        <div key={rutina.id}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-accent">{rutina.nombre}</p>
            <p className="text-xs text-white/30">Semana {(currentWeek ?? 1)}/4</p>
          </div>
          {rutina.dias.map((dia) => {
            const semanas = (weeksCompletadas[dia.id] ?? []).sort((a, b) => a - b);
            const completado = semanas.length > 0;
            return (
            <Link key={dia.id} href="#" onClick={(e) => { e.preventDefault(); setWeekModalRuta(rutina.id); setWeekModalDia(dia.id); setWeekModalSelected(currentWeek ?? 1); }} className="card-hover block mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${completado ? "bg-accent border-accent" : "border-white/20"}`}>
                    {completado && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{dia.nombre}</p>
                    <p className="text-sm text-white/40 capitalize">{dia.diaSemana}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold bg-accent text-bg-primary px-3 py-1.5 rounded-lg">Comenzar</span>
                </div>
              </div>
              {semanas.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-accent/70 font-medium bg-accent/[0.06] px-2.5 py-1 rounded-full">
                    Semana{semanas.length > 1 ? "s" : ""} {(semanas.length > 2 ? semanas.slice(0, -1).join(", ") + " y " + semanas[semanas.length - 1] : semanas.join(" y "))} completada{semanas.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <div className="space-y-1.5">
                  {(function() { const weekIdx = (currentWeek ?? 1) - 1; return dia.ejercicios.map((ej) => {
                    const s = ejercicioWeekValue(ej, "series", ej.series, weekIdx);
                    const r = ejercicioWeekValue(ej, "reps", ej.reps, weekIdx);
                    const d = ejercicioWeekValue(ej, "descanso", ej.descansoSegundos, weekIdx);
                    return (
                    <div key={ej.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/20">{ej.grupoMuscular.slice(0, 3)}</span>
                        <span className="text-white/70">{ej.ejercicioNombre}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white/30 text-xs">{s}×{r} · {d}s</span>
                        {ej.videoUrl && <TutorialButton videoUrl={ej.videoUrl} />}
                      </div>
                    </div>
                    );
                  });})()}
              </div>
            </Link>
            );
          })}
        </div>
      ))}
      {indicacionesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-6 overflow-y-auto" onClick={() => setIndicacionesModal(null)}>
          <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Indicaciones semanales</h3>
              <span className="text-xs text-white/30">{indicacionesModal.dia.nombre}</span>
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((w) => {
                const texto = indicacionesModal.rutina.indicacionesSemanales?.[w];
                if (!texto?.trim()) return null;
                return (
                  <div key={w} className="bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                    <p className="text-xs font-semibold text-accent mb-1">Semana {w + 1}</p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{texto}</p>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setIndicacionesModal(null)} className="btn-primary w-full mt-4">Cerrar</button>
          </div>
        </div>
      )}
      {(weekModalRuta && weekModalDia) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="card max-w-sm w-full text-center">
            <p className="text-lg font-bold text-white mb-1">¿En qué semana vas?</p>
            <p className="text-xs text-white/40 mb-5">Elegí la semana para ver tu entreno</p>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[1, 2, 3, 4].map((w) => (
                <button key={w} onClick={() => setWeekModalSelected(w)}
                  className={`py-3 rounded-xl font-bold transition-all ${weekModalSelected === w ? "bg-accent text-bg-primary" : "bg-white/[0.06] text-white hover:bg-white/[0.12]"}`}>
                  {w}
                </button>
              ))}
            </div>
            <button onClick={async () => { await setCurrentWeekStore(weekModalSelected); const r = weekModalRuta; const d = weekModalDia; setWeekModalRuta(null); setWeekModalDia(null); router.push(`/alumno/entrenos/activo?rutinaId=${r}&diaId=${d}`); }}
              className="btn-primary w-full mb-2">Aceptar</button>
            <button onClick={() => { setWeekModalRuta(null); setWeekModalDia(null); }} className="text-sm text-white/40 hover:text-white/60">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
