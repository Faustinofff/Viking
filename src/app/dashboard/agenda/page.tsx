"use client";
import { useState } from "react";
import { useAppStore, type WeekDay, type SesionAgenda } from "@/lib/store";

const ALL_WEEKDAYS: WeekDay[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const DIAS_SEMANA: { value: WeekDay; label: string }[] = [
  { value: "lunes", label: "Lun" },
  { value: "martes", label: "Mar" },
  { value: "miercoles", label: "Mié" },
  { value: "jueves", label: "Jue" },
  { value: "viernes", label: "Vie" },
  { value: "sabado", label: "Sáb" },
  { value: "domingo", label: "Dom" },
];

const WEEKDAY_MAP: Record<number, WeekDay> = {
  0: "domingo", 1: "lunes", 2: "martes", 3: "miercoles",
  4: "jueves", 5: "viernes", 6: "sabado",
};

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function buildCalendar(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}

function dateToISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getWeekdayFromISO(iso: string): WeekDay {
  const d = new Date(iso + "T12:00:00");
  return WEEKDAY_MAP[d.getDay()];
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

export default function AgendaPage() {
  const agenda = useAppStore((s) => s.agenda);
  const alumnos = useAppStore((s) => s.alumnos);
  const agregarSesion = useAppStore((s) => s.agregarSesion);
  const editarSesion = useAppStore((s) => s.editarSesion);
  const eliminarSesion = useAppStore((s) => s.eliminarSesion);

  const today = new Date();
  const todayISO = dateToISO(today.getFullYear(), today.getMonth(), today.getDate());

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedISO, setSelectedISO] = useState(todayISO);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState(todayISO);
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("18:00");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [alumnoIds, setAlumnoIds] = useState<string[]>([]);
  const [repetirDiario, setRepetirDiario] = useState(false);

  const weeks = buildCalendar(currentYear, currentMonth);

  const isEditing = editingId !== null;

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  };

  const openCreate = (iso?: string) => {
    setEditingId(null);
    setSessionDate(iso ?? selectedISO);
    setTitulo("");
    setHora("18:00");
    setGrupoMuscular("");
    setAlumnoIds([]);
    setRepetirDiario(false);
    setShowModal(true);
  };

  const openEdit = (s: SesionAgenda) => {
    setEditingId(s.id);
    setSessionDate(s.fecha ?? selectedISO);
    setTitulo(s.titulo);
    setHora(s.hora);
    setGrupoMuscular(s.grupoMuscular);
    setAlumnoIds(s.alumnoIds);
    setRepetirDiario(false);
    setShowModal(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !hora || !grupoMuscular) return;

    if (isEditing) {
      editarSesion(editingId, {
        titulo: titulo.trim(),
        hora,
        grupoMuscular: grupoMuscular.trim(),
        alumnoIds,
      });
    } else {
      const coachId = useAppStore.getState().usuarioActual?.id ?? "";
      agregarSesion({
        coachId,
        diaSemana: getWeekdayFromISO(sessionDate),
        fecha: sessionDate,
        hora,
        titulo: titulo.trim(),
        grupoMuscular: grupoMuscular.trim(),
        alumnoIds,
      });
      if (repetirDiario) {
        for (const dia of ALL_WEEKDAYS) {
          if (dia === getWeekdayFromISO(sessionDate)) continue;
          agregarSesion({
            coachId,
            diaSemana: dia,
            hora,
            titulo: titulo.trim(),
            grupoMuscular: grupoMuscular.trim(),
            alumnoIds,
          });
        }
      }
    }
    setShowModal(false);
  };

  const sessionsForDate = (iso: string) => {
    const weekday = getWeekdayFromISO(iso);
    return agenda.filter((s) => {
      if (s.fecha) return s.fecha === iso;
      return s.diaSemana === weekday;
    });
  };

  const selectedSessions = sessionsForDate(selectedISO).sort((a, b) => a.hora.localeCompare(b.hora));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Agenda</h1>
          <p className="text-white/40 mt-1">Organizá tus sesiones de entrenamiento.</p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary">+ Nueva Sesión</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-white/40 hover:text-white text-lg p-1">&lt;</button>
            <h2 className="text-lg font-semibold text-white">{MONTHS[currentMonth]} {currentYear}</h2>
            <button onClick={nextMonth} className="text-white/40 hover:text-white text-lg p-1">&gt;</button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DIAS_SEMANA.map((d) => (
              <div key={d.value} className="text-center text-[11px] font-medium text-white/30 py-1 uppercase tracking-wider">
                {d.label}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (day === null) return <div key={`e-${di}`} className="aspect-square p-1" />;
                const iso = dateToISO(currentYear, currentMonth, day);
                const sessions = sessionsForDate(iso);
                const esHoy = iso === todayISO;
                const esSeleccionado = iso === selectedISO;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedISO(iso)}
                    className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-start pt-1.5 transition-all text-sm ${
                      esSeleccionado
                        ? "bg-accent/10 border border-accent/20"
                        : esHoy
                        ? "bg-white/[0.04] border border-white/10"
                        : "hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <span className={`font-medium leading-none ${esHoy ? "text-accent" : "text-white/70"}`}>{day}</span>
                    {sessions.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {sessions.slice(0, 3).map((s) => (
                          <div key={s.id} className="w-1.5 h-1.5 rounded-full bg-accent/60" title={s.titulo} />
                        ))}
                        {sessions.length > 3 && (
                          <span className="text-[9px] text-white/30">+{sessions.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white capitalize">{formatDate(selectedISO)}</h2>
            <button onClick={() => openCreate(selectedISO)} className="text-accent text-sm font-medium hover:underline">+</button>
          </div>
          {selectedSessions.length > 0 ? (
            <div className="space-y-2">
              {selectedSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 glass rounded-xl border border-white/[0.06]">
                  <div className="text-base font-mono text-accent font-medium w-14 shrink-0">{s.hora}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{s.titulo}</p>
                    <p className="text-xs text-white/40">{s.grupoMuscular}{s.fecha ? "" : " · Semanal"}</p>
                  </div>
                  <div className="flex -space-x-2 shrink-0">
                    {s.alumnoIds.map((aid) => {
                      const a = alumnos.find((al) => al.id === aid);
                      return (
                        <div key={aid} className="w-7 h-7 rounded-full bg-white/[0.08] border-2 border-bg-secondary flex items-center justify-center text-[10px] font-medium text-white/60"
                          title={a?.nombre}>
                          {a?.nombre?.[0] ?? "?"}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => openEdit(s)} className="text-white/30 hover:text-accent text-xs p-1 shrink-0" title="Editar">✎</button>
                  <button onClick={() => eliminarSesion(s.id)} className="text-white/20 hover:text-red-400 text-xs p-1 shrink-0" title="Eliminar">✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-white/30 mb-3">Sin sesiones para este día</p>
              <button onClick={() => openCreate(selectedISO)} className="text-accent text-sm font-medium hover:underline">+ Agendar sesión</button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{isEditing ? "Editar Sesión" : "Nueva Sesión"}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Fecha</label>
                <input type="date" className="input min-w-0" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required={!isEditing} disabled={isEditing} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-1.5">Hora</label>
                  <input type="time" className="input min-w-0" value={hora} onChange={(e) => setHora(e.target.value)} required />
                </div>
                <div>
                  <label className="label block mb-1.5">Grupo Muscular</label>
                  <input className="input" placeholder="Ej: Espalda y Bíceps" value={grupoMuscular} onChange={(e) => setGrupoMuscular(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label block mb-1.5">Título</label>
                <input className="input" placeholder="Ej: Entreno Juan + Pedro" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
              </div>
              <div>
                <label className="label block mb-1.5">Alumnos</label>
                <div className="flex flex-wrap gap-2">
                  {alumnos.map((a) => (
                    <button key={a.id} type="button" onClick={() => setAlumnoIds((prev) => prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        alumnoIds.includes(a.id) ? "bg-accent/10 border-accent/30 text-accent" : "border-white/[0.08] text-white/50 hover:border-white/20"
                      }`}
                    >
                      {a.nombre.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              {!isEditing && (
                <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                  <input type="checkbox" checked={repetirDiario} onChange={(e) => setRepetirDiario(e.target.checked)} className="accent-accent" />
                  Repetir todos los días (Lun–Dom)
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">{isEditing ? "Guardar" : "Crear Sesión"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
