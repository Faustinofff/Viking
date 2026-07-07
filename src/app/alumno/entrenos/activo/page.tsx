"use client";
import { useState, useEffect, useCallback, useMemo, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore, type Rutina } from "@/lib/store";
import { getStudentWorkoutPlans, getStudentCurrentWeek, saveStudentCurrentWeek, ejercicioWeekValue, parseIndicacionesSemanales } from "@/lib/data";

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rutinaIdParam = searchParams.get("rutinaId");
  const diaIdParam = searchParams.get("diaId");

  const usuario = useAppStore((s) => s.usuarioActual);
  const sesionesEntreno = useAppStore((s) => s.sesionesEntreno);
  const iniciarSesionEntreno = useAppStore((s) => s.iniciarSesionEntreno);
  const completarSerie = useAppStore((s) => s.completarSerie);
  const completarEntreno = useAppStore((s) => s.completarEntreno);
  const currentWeek = useAppStore((s) => s.currentWeek);
  const loadCurrentWeek = useAppStore((s) => s.loadCurrentWeek);
  const setCurrentWeekStore = useAppStore((s) => s.setCurrentWeek);

  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [dia, setDia] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showWeekSelector, setShowWeekSelector] = useState(false);

  useEffect(() => {
    if (!usuario?.id) return;
    const load = async () => {
      try {
        await loadCurrentWeek();
        const plans = await getStudentWorkoutPlans(usuario.id);
        const DAY_ORDER: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
        const parsed: Rutina[] = plans.map((p: any) => ({
          id: p.id,
          coachId: p.coach_id ?? "",
          nombre: p.name,
          descripcion: p.description ?? "",
          alumnoId: usuario.id,
          mes: 1,
          anio: 2026,
          activa: true,
          creadoEn: p.created_at,
          indicacionesSemanales: parseIndicacionesSemanales(p.description),
          dias: (p.workout_days ?? []).sort((a: any, b: any) => (DAY_ORDER[a.week_day] ?? 99) - (DAY_ORDER[b.week_day] ?? 99)).map((d: any) => ({
            id: d.id,
            nombre: d.day_name,
            diaSemana: d.week_day === "monday" ? "lunes" :
              d.week_day === "tuesday" ? "martes" :
              d.week_day === "wednesday" ? "miercoles" :
              d.week_day === "thursday" ? "jueves" :
              d.week_day === "friday" ? "viernes" :
              d.week_day === "saturday" ? "sabado" : "domingo",
            ejercicios: (d.workout_exercises ?? []).map((we: any) => {
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
            }),
          })),
        }));

        // Populate the store so iniciarSesionEntreno can find the day/exercises
        useAppStore.setState({ rutinas: parsed });

        // Find matching routine and day
        const targetRutinaId = rutinaIdParam;
        const targetDiaId = diaIdParam;
        if (targetRutinaId && targetDiaId) {
          const r = parsed.find((p) => p.id === targetRutinaId);
          if (r) {
            setRutina(r);
            const d = r.dias.find((dd) => dd.id === targetDiaId);
            if (d) setDia(d);
          }
        }
      } catch (e) {
        console.error("Error loading workout:", e);
      }
      setLoading(false);
    };
    load();
  }, [usuario?.id]);

  // Show week selector if not set
  useEffect(() => {
    if (!loading && currentWeek === null) {
      setShowWeekSelector(true);
    }
  }, [loading, currentWeek]);

  const alumnoId = usuario?.id ?? "";
  const sesionActiva = useMemo(
    () => sesionesEntreno.find((s) => s.alumnoId === alumnoId && !s.completada),
    [sesionesEntreno, alumnoId]
  );

  const [sesionId, setSesionId] = useState<string | null>(null);
  const [currentEjIndex, setCurrentEjIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restEndTime, setRestEndTime] = useState<number | null>(null);
  const [restActive, setRestActive] = useState(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const restTimer = restEndTime !== null ? Math.max(0, Math.floor((restEndTime - Date.now()) / 1000)) : null;
  const [ejCompletados, setEjCompletados] = useState<Set<number>>(new Set());
  const [setsCompletadosLocal, setSetsCompletadosLocal] = useState<Set<string>>(new Set());
  const [pesosInput, setPesosInput] = useState<Record<string, string>>({});
  const [verEspecs, setVerEspecs] = useState(false);
  const [verSemanales, setVerSemanales] = useState(false);
  const [weekToast, setWeekToast] = useState<string | null>(null);

  const currentEjercicio = dia?.ejercicios[currentEjIndex];
  const allEjercicios = dia?.ejercicios ?? [];
  const weekIdx = useMemo(() => (currentWeek ?? 1) - 1, [currentWeek]);
  const weekEjercicios = useMemo(() => allEjercicios.map((ej: any) => ({
    ...ej,
    series: ejercicioWeekValue(ej, "series", ej.series, weekIdx),
    reps: ejercicioWeekValue(ej, "reps", ej.reps, weekIdx),
    descansoSegundos: ejercicioWeekValue(ej, "descanso", ej.descansoSegundos, weekIdx),
    notas: ejercicioWeekValue(ej, "notas", ej.notas ?? "", weekIdx),
  })), [allEjercicios, weekIdx]);
  const currentWeekEj = weekEjercicios[currentEjIndex];

  const sesion = useMemo(() => sesionesEntreno.find((s) => s.id === sesionId), [sesionesEntreno, sesionId]);

  // Initialize session and restore position
  useEffect(() => {
    if (!alumnoId || !rutina || !dia || sesionId) return;
    if (sesionActiva) {
      setSesionId(sesionActiva.id);
    } else {
      const id = iniciarSesionEntreno(alumnoId, rutina.id, dia.id);
      setSesionId(id);
    }
  }, [alumnoId, rutina, dia, sesionId]);

  // Restore current position from existing session
  useEffect(() => {
    if (!sesion || !allEjercicios.length) return;
    // Populate local completed sets from session
    const local = new Set<string>();
    sesion.series.filter((s) => s.completada).forEach((s) => {
      local.add(`${s.ejercicioId}_${s.serie}`);
    });
    setSetsCompletadosLocal(local);
    const completados: number[] = [];
      allEjercicios.forEach((ej: any, idx: number) => {
      const we = weekEjercicios[idx];
      const setsCompletados = sesion.series.filter(
        (s) => s.ejercicioId === ej.ejercicioId && s.completada
      ).length;
      if (setsCompletados >= we.series) completados.push(idx);
    });
    if (completados.length) setEjCompletados(new Set(completados));
    const primeraIncompleta = sesion.series.find((s) => !s.completada);
    if (primeraIncompleta) {
      const ejIdx = allEjercicios.findIndex((e: any) => e.ejercicioId === primeraIncompleta.ejercicioId);
      if (ejIdx >= 0) {
        setCurrentEjIndex(ejIdx);
        setCurrentSet(primeraIncompleta.serie);
      }
    }
  }, [sesion?.id, allEjercicios.length]);

  // Reset especificaciones when exercise changes
  useEffect(() => {
    setVerEspecs(false);
    setVerSemanales(false);
    setWeekToast(null);
  }, [currentEjIndex]);

  // Rest timer countdown using absolute timestamp
  useEffect(() => {
    if (!restActive || restEndTime === null) return;
    const interval = setInterval(() => {
      if (Date.now() >= restEndTime) {
        setRestActive(false);
      } else {
        forceUpdate();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [restActive, restEndTime]);

  // Sync timer when app returns to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") forceUpdate();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const totalSets = useMemo(() =>
    weekEjercicios.reduce((sum: number, e: any) => sum + e.series, 0),
    [weekEjercicios]
  );
  const completedSets = useMemo(() =>
    sesion?.series.filter((s) => s.completada).length ?? 0,
    [sesion]
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const completarSetActual = useCallback(() => {
    if (!sesionId || !currentWeekEj) return;
    const key = `${currentWeekEj.ejercicioId}_${currentSet}`;
    setSetsCompletadosLocal((prev) => new Set(prev).add(key));
    const peso = parseFloat(pesosInput[`${currentWeekEj.ejercicioId}_${currentSet}`] ?? "0");
    completarSerie(sesionId, currentWeekEj.ejercicioId, currentSet, peso || undefined, currentWeekEj.reps);
    setRestEndTime(Date.now() + currentWeekEj.descansoSegundos * 1000);
    setRestActive(true);
  }, [sesionId, currentWeekEj, currentSet, pesosInput, completarSerie]);

  const skipRest = useCallback(() => {
    setRestEndTime(Date.now() - 1000);
    setRestActive(false);
  }, []);

  const avanzar = useCallback(() => {
    setRestEndTime(null);
    if (!currentWeekEj || !sesionId) return;
    const key = `${currentWeekEj.ejercicioId}_${currentSet}`;
    setSetsCompletadosLocal((prev) => new Set(prev).add(key));
    const alreadyCompleted = sesion?.series.some(
      (s) => s.ejercicioId === currentWeekEj.ejercicioId && s.serie === currentSet && s.completada
    );
    if (!alreadyCompleted) {
      completarSerie(sesionId, currentWeekEj.ejercicioId, currentSet, undefined, currentWeekEj.reps);
    }
    if (currentSet < currentWeekEj.series) {
      setCurrentSet((s) => s + 1);
    } else {
      setEjCompletados((prev) => new Set(prev).add(currentEjIndex));
      if (currentEjIndex < allEjercicios.length - 1) {
        setCurrentEjIndex((i) => i + 1);
        setCurrentSet(1);
      } else {
        completarEntreno(sesionId);
      }
    }
  }, [currentWeekEj, currentSet, currentEjIndex, allEjercicios.length, sesionId, sesion, completarSerie, completarEntreno]);

  const isLastSet = currentWeekEj ? currentSet >= currentWeekEj.series : false;
  const isLastEjercicio = currentEjIndex >= allEjercicios.length - 1;
  const isWorkoutComplete = sesion?.completada ?? false;

  if (loading) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <div className="w-8 h-8 rounded-lg bg-accent animate-pulse mx-auto mb-4" />
      </div>
    );
  }

  if (!dia) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <p className="text-white/40 mb-2">No hay entreno disponible</p>
        <Link href="/alumno/entrenos" className="text-accent text-sm inline-block">Volver</Link>
      </div>
    );
  }

  if (allEjercicios.length === 0) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <p className="text-white/40 mb-2">Este día no tiene ejercicios asignados</p>
        <Link href="/alumno/entrenos" className="text-accent text-sm inline-block">Volver</Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/alumno/entrenos" className="text-sm text-white/30 hover:text-white/50">← Salir</Link>
        <div className="text-center">
          <p className="text-base font-bold text-white">{dia.nombre}</p>
          <p className="text-xs text-white/40">
            Semana {weekIdx + 1}/4 · {completedSets}/{totalSets} series
            <button onClick={() => setShowWeekSelector(true)} className="ml-2 text-accent hover:text-accent/80 underline">Cambiar semana</button>
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <span className="text-sm font-bold text-accent">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {isWorkoutComplete && (
        <div className="card-glow text-center py-8 space-y-4">
          <p className="text-4xl">🎉</p>
          <p className="text-lg font-bold text-white">Entreno completado</p>
          <p className="text-sm text-white/40">¡Buen trabajo! Completaste todas las series.</p>
          <button onClick={() => router.push("/alumno/entrenos")} className="btn-primary">
            Volver a entrenos
          </button>
        </div>
      )}

      {!isWorkoutComplete && currentWeekEj && (
        <div className="card">
            <div className="mb-4">
            <div>
              <p className="flex items-center gap-2">
                <span className="text-xs text-white/30 font-mono">{currentEjIndex + 1}/{allEjercicios.length}</span>
                <span className="text-lg font-bold text-white">{currentWeekEj.ejercicioNombre}</span>
              </p>
              <p className="text-xs text-white/40 mt-0.5">{currentWeekEj.grupoMuscular}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-white/30 bg-white/[0.05] px-2.5 py-1 rounded-full">
                  {currentWeekEj.series}×{currentWeekEj.reps} · {currentWeekEj.descansoSegundos}s
                </span>
                {currentWeekEj.notas && <button onClick={() => setVerEspecs(!verEspecs)} className="bg-white/5 text-white/70 font-medium rounded-lg px-2 py-1 text-[10px] hover:bg-white/10 transition-all border border-white/10">Indicaciones del ejercicio</button>}
                {rutina?.indicacionesSemanales?.some((s) => s.trim()) && <button onClick={() => setVerSemanales(!verSemanales)} className="bg-accent/10 text-accent font-medium rounded-lg px-2 py-1 text-[10px] hover:bg-accent/20 transition-all border border-accent/20">Indicaciones semanales</button>}
                {currentWeekEj.videoUrl && <a href={currentWeekEj.videoUrl} target="_blank" rel="noopener noreferrer" className="bg-accent/10 text-accent font-medium rounded-lg px-2 py-1 text-[10px] hover:bg-accent/20 transition-all border border-accent/20">Tutorial</a>}
              </div>
              {verEspecs && currentWeekEj.notas && (
                <div className="mt-2 bg-white/[0.04] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Indicaciones del ejercicio</p>
                  <p className="text-xs text-white/80 whitespace-pre-wrap">{currentWeekEj.notas}</p>
                </div>
              )}
              {verSemanales && rutina?.indicacionesSemanales?.some((s) => s.trim()) && (
                <div className="mt-2 flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((w) => {
                    const texto = (rutina.indicacionesSemanales ?? [])[w];
                    if (!texto?.trim()) return null;
                    return (
                      <button key={w} onClick={() => setWeekToast(texto)}
                        className="text-[11px] font-medium text-white/70 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-accent/30 transition-all px-2.5 py-1">
                        Semana {w + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {Array.from({ length: currentWeekEj.series }, (_, i) => i + 1).map((serieNum) => {
              const completada = (
                sesion?.series.some(
                  (s) => s.ejercicioId === currentWeekEj.ejercicioId && s.serie === serieNum && s.completada
                ) ?? false
              ) || setsCompletadosLocal.has(`${currentWeekEj.ejercicioId}_${serieNum}`);
              const isActive = serieNum === currentSet;

              return (
                <div
                  key={serieNum}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    completada
                      ? "bg-accent/10 border-accent/20"
                      : isActive && !restActive
                      ? "bg-white/[0.06] border-accent/40"
                      : "bg-white/[0.03] border-white/[0.06]"
                  } ${restActive && isActive && !completada ? "opacity-40" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    completada ? "bg-accent border-accent" : "border-white/20"
                  }`}>
                    {completada && <span className="text-bg-primary text-xs font-bold">✓</span>}
                  </div>
                  <span className={`text-sm font-medium ${completada ? "text-accent" : isActive ? "text-white" : "text-white/40"}`}>
                    Serie {serieNum}
                  </span>
                  <span className={`text-xs ${completada ? "text-accent/50" : "text-white/30"}`}>
                    {currentWeekEj.reps} reps
                  </span>
                  {!completada && isActive && (
                    <>
                      <div className="flex-1" />
                      <input
                        type="number"
                        step="0.5"
                        placeholder="kg"
                        value={pesosInput[`${currentWeekEj.ejercicioId}_${serieNum}`] ?? ""}
                        onChange={(e) => setPesosInput({ ...pesosInput, [`${currentWeekEj.ejercicioId}_${serieNum}`]: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                          className="w-16 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-2 text-xs text-white/60 text-center focus:outline-none focus:border-accent"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {restActive ? (
            <div className="card-glow text-center py-5">
              <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-2">Descanso</p>
              <p className={`text-5xl font-light tracking-wider mb-3 ${restTimer !== null && restTimer <= 5 ? "text-accent" : "text-white"}`}>
                {restTimer !== null
                  ? `${Math.floor(restTimer / 60)}:${String(restTimer % 60).padStart(2, "0")}`
                  : "0:00"}
              </p>
              <button onClick={skipRest} className="btn-ghost text-sm">Saltar descanso →</button>
            </div>
          ) : restTimer === 0 ? (
            <div className="card-glow text-center py-4 border-accent/30">
              <p className="text-sm font-semibold text-accent mb-1">¡Descanso terminado!</p>
              <p className="text-xs text-white/50 mb-3">
                {isLastSet && isLastEjercicio ? "Último ejercicio completado" : isLastSet ? "Última serie de este ejercicio" : `Preparate para la serie ${currentSet + 1}`}
              </p>
              <button onClick={avanzar} className="btn-primary">
                {isLastSet && isLastEjercicio ? "Finalizar entreno →" : isLastSet ? "Siguiente ejercicio →" : `Serie ${currentSet + 1} →`}
              </button>
            </div>
          ) : (
            <button
              onClick={completarSetActual}
              disabled={restActive}
              className="btn-primary w-full py-3"
            >
              {`Finalizar serie ${currentSet}`}
            </button>
          )}
        </div>
      )}

      {!isWorkoutComplete && allEjercicios.length > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {allEjercicios.map((ej: any, idx: number) => (
            <div key={ej.id} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                ejCompletados.has(idx) ? "bg-accent" : idx === currentEjIndex ? "bg-white/40" : "bg-white/[0.08]"
              }`} />
              {idx < allEjercicios.length - 1 && (
                <div className={`w-4 h-[2px] transition-all ${
                  ejCompletados.has(idx) ? "bg-accent/40" : "bg-white/[0.06]"
                }`} />
              )}
            </div>
          ))}
        </div>
      )}

      {weekToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setWeekToast(null)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Indicación semanal</p>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed mb-6">{weekToast}</p>
            <button onClick={() => setWeekToast(null)} className="btn-primary w-full py-2.5 text-sm">Entendido</button>
          </div>
        </div>
      )}

      {showWeekSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="card max-w-sm w-full text-center">
            <p className="text-lg font-bold text-white mb-1">¿En qué semana vas?</p>
            <p className="text-xs text-white/40 mb-5">Seleccioná la semana actual de tu rutina</p>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[1, 2, 3, 4].map((w) => (
                <button key={w} onClick={async () => { await setCurrentWeekStore(w); setShowWeekSelector(false); }}
                  className={`py-3 rounded-xl font-bold transition-all ${currentWeek === w ? "bg-accent text-bg-primary" : "bg-white/[0.06] text-white hover:bg-white/[0.12]"}`}>
                  {w}
                </button>
              ))}
            </div>
            {currentWeek !== null && (
              <button onClick={() => setShowWeekSelector(false)} className="text-sm text-white/40 hover:text-white/60">Cancelar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
