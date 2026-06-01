"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAppStore, type WeekDay } from "@/lib/store";
import { getStudentWorkoutPlans, getCompletionsBatch } from "@/lib/data";

const DIAS: { value: WeekDay; label: string }[] = [
  { value: "lunes", label: "Lunes" }, { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" }, { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" }, { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

function getWeekDates(offset = 0): Record<WeekDay, { date: Date; dateStr: string }> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + offset * 7);
  const result = {} as Record<WeekDay, { date: Date; dateStr: string }>;
  const map: WeekDay[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  map.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result[day] = { date: d, dateStr: d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) };
  });
  return result;
}

export default function StudentAgendaPage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const agenda = useAppStore((s) => s.agenda);
  const sesionesEntreno = useAppStore((s) => s.sesionesEntreno);

  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const hoy = new Date();
  const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const diaHoy = diasSemana[hoy.getDay()] as WeekDay;

  const [rutinas, setRutinas] = useState<any[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<WeekDay>(diaHoy);

  useEffect(() => {
    if (!usuario?.id) return;
    getStudentWorkoutPlans(usuario.id).then((plans) => {
      const parsed = plans.map((p: any) => ({
        id: p.id, nombre: p.name,
        dias: (p.workout_days ?? []).map((d: any) => ({
          id: d.id, nombre: d.day_name,
          diaSemana: d.week_day === "monday" ? "lunes" : d.week_day === "tuesday" ? "martes" : d.week_day === "wednesday" ? "miercoles" : d.week_day === "thursday" ? "jueves" : d.week_day === "friday" ? "viernes" : d.week_day === "saturday" ? "sabado" : "domingo",
          ejercicios: (d.workout_exercises ?? []).map((we: any) => ({
            id: we.id, ejercicioNombre: (() => { try { const m = JSON.parse(we.notes || "{}"); return m.n || ""; } catch { return ""; } })(),
            series: (we.exercise_sets ?? []).length,
          })),
        })),
      }));
      setRutinas(parsed);
    }).catch(() => {});
    getCompletionsBatch(usuario.id).then(setCompletions).catch(() => {});
  }, [usuario?.id]);

  const sesionesCoach = agenda.filter((s) =>
    s.alumnoIds?.includes(usuario?.id ?? "") ||
    (s as any).alumnoEmails?.includes(usuario?.email ?? "")
  );
  const rutinaDia = rutinas.flatMap((r) => r.dias).filter((d) => d.diaSemana === selectedDay);
  const sesionesDelDia = sesionesCoach.filter((s) => {
    const date = weekDates[selectedDay].date;
    const isoSelected = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (s.fecha) return s.diaSemana === selectedDay && s.fecha === isoSelected;
    return s.diaSemana === selectedDay;
  });

  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const idsDelDia = new Set(sesionesDelDia.map((s) => s.id));
  const proximas = sesionesCoach
    .filter((s) => {
      if (idsDelDia.has(s.id)) return false;
      if (s.fecha) return s.fecha >= hoyISO;
      return false;
    })
    .sort((a, b) => {
      if (!a.fecha || !b.fecha) return 0;
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora.localeCompare(b.hora);
    })
    .slice(0, 10);

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Mi Agenda</h1>
          <p className="text-white/40 text-sm mt-0.5">Semana del {weekDates["lunes"].dateStr}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="text-xs text-white/40 hover:text-white font-medium px-2 py-1 rounded transition-colors">← Semana anterior</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="text-xs text-white/40 hover:text-white font-medium px-2 py-1 rounded transition-colors">Semana siguiente →</button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {DIAS.map((d) => {
          const wd = weekDates[d.value];
          const esHoy = d.value === diaHoy && weekOffset === 0;
          return (
            <button key={d.value} onClick={() => setSelectedDay(d.value)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl shrink-0 transition-all min-w-[60px] ${
                selectedDay === d.value ? "bg-accent/10 text-accent border border-accent/20" : "text-white/40 hover:text-white/70 border border-transparent"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">{d.label.slice(0, 3)}</span>
              <span className={`text-sm font-bold ${esHoy ? "text-accent" : ""}`}>{wd.date.getDate()}</span>
              <span className="text-[9px] text-white/30">{wd.dateStr.split(" ")[1]}</span>
            </button>
          );
        })}
      </div>

      {sesionesDelDia.map((s) => (
        <div key={s.id} className="card border-l-4 border-l-accent">
          <div className="flex items-center gap-3">
            <div className="text-lg font-mono text-accent font-medium">{s.hora}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{s.titulo}</p>
               <p className="text-xs text-white/40">{s.fecha ? "Entreno con tu coach ·" : "Semanal ·"} {s.grupoMuscular}</p>
            </div>
          </div>
        </div>
      ))}

      {sesionesDelDia.length === 0 && rutinaDia.length === 0 && proximas.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-white/30 text-sm">Sin actividades para este día</p>
        </div>
      )}

      {proximas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Próximas sesiones</h3>
          <div className="space-y-2">
            {proximas.map((s) => {
              const d = new Date(s.fecha! + "T12:00:00");
              const fechaStr = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
              return (
                <div key={s.id} className="card border-l-4 border-l-accent/40">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-mono text-accent font-medium">{s.hora}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{s.titulo}</p>
                      <p className="text-xs text-white/40">{fechaStr} · {s.grupoMuscular}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rutinaDia.map((dia) => (
        <Link key={dia.id} href={`/alumno/entrenos/activo?rutinaId=${rutinas.find((r) => r.dias.some((d: any) => d.id === dia.id))?.id}&diaId=${dia.id}`}
          className={`card-hover block ${completions[dia.id] ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${completions[dia.id] ? "bg-accent border-accent" : "border-white/20"}`}>
                {completions[dia.id] && <span className="text-bg-primary text-[10px] font-bold">✓</span>}
              </div>
              <p className="text-sm font-bold text-white">{dia.nombre}</p>
            </div>
            {completions[dia.id] ? (
              <span className="text-xs text-accent">Completado</span>
            ) : (
              <span className="text-white/20 text-sm">→</span>
            )}
          </div>
          <p className="text-xs text-white/30">{dia.ejercicios.length} ejercicios</p>
        </Link>
      ))}
    </div>
  );
}
