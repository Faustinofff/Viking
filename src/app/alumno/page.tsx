"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore, type Rutina } from "@/lib/store";
import { getStudentWorkoutPlans, ejercicioWeekValue } from "@/lib/data";
import TutorialButton from "@/components/tutorial-button";

const MEAL_CHECK_KEY = "viking_meal_checks";

function loadChecks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(MEAL_CHECK_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveChecks(ids: Set<string>) {
  try { localStorage.setItem(MEAL_CHECK_KEY, JSON.stringify([...ids])); } catch {}
}

export default function StudentDashboard() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const getPlanesAlumno = useAppStore((s) => s.getPlanesAlumno);
  const getSesionEntrenoActiva = useAppStore((s) => s.getSesionEntrenoActiva);
  const registrosAgua = useAppStore((s) => s.registrosAgua);
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(loadChecks);
  const currentWeek = useAppStore((s) => s.currentWeek);

  useEffect(() => {
    if (!usuario?.id) return;
    getStudentWorkoutPlans(usuario.id).then((plans) => {
            const parsed: Rutina[] = plans.map((p: any) => ({
        id: p.id, coachId: p.coach_id ?? "", nombre: p.name, descripcion: p.description ?? "",
        alumnoId: usuario.id, mes: 1, anio: 2026, activa: true, creadoEn: p.created_at,
        dias: (p.workout_days ?? []).map((d: any) => ({
          id: d.id, nombre: d.day_name,
          diaSemana: d.week_day === "monday" ? "lunes" : d.week_day === "tuesday" ? "martes" : d.week_day === "wednesday" ? "miercoles" : d.week_day === "thursday" ? "jueves" : d.week_day === "friday" ? "viernes" : d.week_day === "saturday" ? "sabado" : "domingo",
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
              id: we.id, ejercicioId: we.exercise_id, ejercicioNombre: nombre, grupoMuscular: grupo,
              series: (we.exercise_sets ?? []).length, reps: (we.exercise_sets ?? [])[0]?.reps ?? 0,
              descansoSegundos: (we.exercise_sets ?? [])[0]?.rest_seconds ?? 90, notas, videoUrl,
              seriesPorSemana, repsPorSemana, descansoPorSemana, notasPorSemana,
            };
          }),
        })),
      }));
      setRutinas(parsed);
    }).catch((e) => console.error("Error loading workouts on dashboard:", e));
  }, [usuario?.id]);

  useEffect(() => {
    const totalEj = rutinas.reduce((s, r) => s + r.dias.reduce((s2, d) => s2 + d.ejercicios.length, 0), 0);
    console.log(`[Dashboard] Rutinas: ${rutinas.length}, ejercicios: ${totalEj}`);
  }, [rutinas]);

  const hoy = new Date();
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const diaHoy = diasSemana[hoy.getDay()] as any;
  const alumno = alumnos.find((a) => a.id === usuario?.id) ?? alumnos.find((a) => a.email === usuario?.email);
  const planesAlumno = alumno ? getPlanesAlumno(alumno.id) : [];
  const plan = planesAlumno[0];
  const entrenoHoy = rutinas.flatMap((r) => r.dias).find((d) => d.diaSemana === diaHoy);
  const hoyStr = new Date().toISOString().split("T")[0];
  const aguaHoy = alumno
    ? registrosAgua
        .filter((r) => r.alumnoId === alumno.id && r.fecha === hoyStr)
        .reduce((s, r) => s + r.vasos, 0)
    : 0;
  const sesionActiva = alumno ? getSesionEntrenoActiva(alumno.id) : undefined;

  const toggleMeal = (mealId: string) => {
    setCheckedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      saveChecks(next);
      return next;
    });
  };

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Hola, {usuario?.nombre?.split(" ")[0]}</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {alumno && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/alumno/entrenos" className="card text-center py-4">
              <p className="text-2xl font-bold text-accent">{rutinas.reduce((s, r) => s + r.dias.length, 0)}</p>
              <p className="text-xs text-white/40">Entrenos/sem</p>
            </Link>
            <Link href="/alumno/progreso" className="card text-center py-4">
              <p className="text-2xl font-bold text-white">{alumno.peso}kg</p>
              <p className="text-xs text-white/40">Peso actual</p>
            </Link>
            <Link href="/alumno/progreso" className="card text-center py-4">
              <p className="text-2xl font-bold text-cyan-400">{aguaHoy}</p>
              <p className="text-xs text-white/40">Vasos hoy</p>
            </Link>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Entreno de Hoy</h2>
              <Link href="/alumno/entrenos" className="text-xs text-accent hover:underline">Ver todos</Link>
            </div>
            {entrenoHoy ? (
              <Link href={sesionActiva ? `/alumno/entrenos/activo?rutinaId=${sesionActiva.rutinaId}&diaId=${sesionActiva.diaRutinaId}` : "/alumno/entrenos"} className="card-hover block">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-white">{entrenoHoy.nombre}</p>
                    <p className="text-sm text-white/40 capitalize">{entrenoHoy.diaSemana} · Semana {currentWeek ?? 1}/4</p>
                  </div>
                  {sesionActiva ? (
                    <span className="badge-green">En curso</span>
                  ) : (
                    <span className="text-accent text-sm font-medium">Comenzar →</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {entrenoHoy.ejercicios.map((ej) => {
                    const weekIdx = (currentWeek ?? 1) - 1;
                    const s = ejercicioWeekValue(ej, "series", ej.series, weekIdx);
                    const r = ejercicioWeekValue(ej, "reps", ej.reps, weekIdx);
                    return (
                    <div key={ej.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                      <span className="text-white/70">{ej.ejercicioNombre}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white/30 text-xs">{s}×{r}</span>
                        {ej.videoUrl && <TutorialButton videoUrl={ej.videoUrl} />}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </Link>
            ) : (
              <div className="card text-center py-8">
                <p className="text-white/30 text-sm">Hoy no tenés entreno asignado</p>
                <p className="text-white/20 text-xs mt-1">Disfrutá el descanso 🎯</p>
              </div>
            )}
          </div>

          {plan && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Comidas de Hoy</h2>
                <Link href="/alumno/nutricion" className="text-xs text-accent hover:underline">Ver plan</Link>
              </div>
              <div className="card">
                {plan.dias.filter((d) => d.diaSemana === diaHoy).map((dia) => (
                  <div key={dia.id} className="space-y-3">
                    {dia.comidas.map((c) => (
                      <div key={`${dia.id}_${c.id}`} className="flex items-start gap-3">
                        <button onClick={() => toggleMeal(`${dia.id}_${c.id}`)} type="button" className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${
                          checkedMeals.has(`${dia.id}_${c.id}`) ? "bg-accent border-accent" : "border-white/30 hover:border-accent/60"
                        }`}>
                          {checkedMeals.has(`${dia.id}_${c.id}`) && <span className="block text-[8px] text-white text-center leading-none">✓</span>}
                        </button>
                        <div>
                          <p className={`text-sm font-medium capitalize ${checkedMeals.has(`${dia.id}_${c.id}`) ? "text-white/30 line-through" : "text-white"}`}>{c.tipo}</p>
                          <p className="text-xs text-white/40">{c.alimentos.join(", ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {(!plan.dias.find((d) => d.diaSemana === diaHoy) || plan.dias.filter((d) => d.diaSemana === diaHoy).length === 0) && (
                  <p className="text-sm text-white/30 text-center py-4">Sin comidas cargadas para hoy</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!alumno && (
        <div className="card text-center py-10">
          <p className="text-lg text-white/50 mb-2">Bienvenido a Viking</p>
          <p className="text-sm text-white/30 mb-4">Tu coach te asignará rutinas y planes pronto.</p>
          <div className="flex justify-center gap-3">
            <Link href="/alumno/entrenos" className="btn-secondary text-sm">Ver Entrenos</Link>
            <Link href="/alumno/progreso" className="btn-secondary text-sm">Mi Progreso</Link>
          </div>
        </div>
      )}
    </div>
  );
}
