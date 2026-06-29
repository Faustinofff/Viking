"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore, type WeekDay, type DiaRutina, type Rutina } from "@/lib/store";
import { useConfirmToast } from "@/components/toast";
import { getCurrentWeekIndex, ejercicioWeekValue, updateWorkoutPlan } from "@/lib/data";

const DIAS_SEMANA: { value: WeekDay; label: string }[] = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const MUSCLE_GROUPS = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps",
  "Cuádriceps", "Isquiotibiales", "Gemelos", "Abdomen", "Glúteos", "Full Body"
];

export default function RutinasPage() {
  const searchParams = useSearchParams();
  const alumnoIdParam = searchParams.get("alumnoId");
  const editRutinaId = searchParams.get("editRutinaId");

  const alumnos = useAppStore((s) => s.alumnos);
  const ejercicios = useAppStore((s) => s.ejercicios);
  const asignarRutina = useAppStore((s) => s.asignarRutina);
  const agregarEjercicioPersonalizado = useAppStore((s) => s.agregarEjercicioPersonalizado);
  const rutinas = useAppStore((s) => s.rutinas);
  const unassignedRoutines = useAppStore((s) => s.unassignedRoutines);
  const saveUnassignedRoutine = useAppStore((s) => s.saveUnassignedRoutine);
  const assignUnassignedRoutine = useAppStore((s) => s.assignUnassignedRoutine);
  const unassignRoutine = useAppStore((s) => s.unassignRoutine);
  const deleteUnassignedRoutine = useAppStore((s) => s.deleteUnassignedRoutine);

  const eliminarRutina = useAppStore((s) => s.eliminarRutina);
  const { confirm, ToastUI } = useConfirmToast();
  const syncCoachData = useAppStore((s) => s.syncCoachData);

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    await syncCoachData();
    setSyncing(false);
  };

  const draft = useRef(useAppStore.getState().pageDrafts.rutinas ?? {}).current;

  const [nombre, setNombre] = useState(draft.nombre ?? "");
  const [alumnoIds, setAlumnoIds] = useState<string[]>(draft.alumnoIds ?? (alumnoIdParam ? [alumnoIdParam] : []));
  const [noAssign, setNoAssign] = useState(draft.noAssign ?? false);
  const [dias, setDias] = useState<DiaRutina[]>(draft.dias ?? []);
  const [showBuilder, setShowBuilder] = useState(draft.showBuilder ?? false);
  const [editandoId, setEditandoId] = useState<string | null>(draft.editandoId ?? null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [showAssignPicker, setShowAssignPicker] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [indicacionesSemanales, setIndicacionesSemanales] = useState<string[]>(["", "", "", ""]);
  const [showIndicaciones, setShowIndicaciones] = useState(false);

  const abrirEditor = (rutina: Rutina) => {
    setNombre(rutina.nombre);
    setAlumnoIds([rutina.alumnoId]);
    setDias(rutina.dias.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      diaSemana: d.diaSemana,
      ejercicios: d.ejercicios.map((ej) => {
        const base = { ...ej };
        if (!ej.seriesPorSemana) base.seriesPorSemana = [ej.series, ej.series, ej.series, ej.series];
        if (!ej.repsPorSemana) base.repsPorSemana = [ej.reps, ej.reps, ej.reps, ej.reps];
        if (!ej.descansoPorSemana) base.descansoPorSemana = [ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos];
        if (!ej.notasPorSemana) base.notasPorSemana = [ej.notas ?? "", "", "", ""];
        return base;
      }),
    })));
    setIndicacionesSemanales(rutina.indicacionesSemanales ?? ["", "", "", ""]);
    setEditandoId(rutina.id);
    setShowBuilder(true);
  };

  // Exercise search state
  const [searchText, setSearchText] = useState(draft.searchText ?? "");
  const [muscleFilter, setMuscleFilter] = useState(draft.muscleFilter ?? "");
  const [diaActivo, setDiaActivo] = useState<string | null>(draft.diaActivo ?? null);
  const [notasAbiertas, setNotasAbiertas] = useState<Set<string>>(new Set(draft.notasAbiertas ?? []));
  const [semanaActiva, setSemanaActiva] = useState<Record<string, number>>(draft.semanaActiva ?? {});

  const setEjercicioTutorial = useAppStore((s) => s.setEjercicioTutorial);

  // Custom exercise modal
  const [showCustomEj, setShowCustomEj] = useState(draft.showCustomEj ?? false);
  const [customNombre, setCustomNombre] = useState(draft.customNombre ?? "");
  const [customMuscle, setCustomMuscle] = useState(draft.customMuscle ?? "Pecho");
  const [customEquipment, setCustomEquipment] = useState(draft.customEquipment ?? "Bodyweight");
  const [customTutorial, setCustomTutorial] = useState("");

  const filteredEjercicios = ejercicios.filter((e) => {
    const matchName = e.nombre.toLowerCase().includes(searchText.toLowerCase());
    const matchMuscle = !muscleFilter || e.grupoMuscular === muscleFilter;
    return matchName && matchMuscle;
  });

  const agregarDia = () => {
    if (dias.length >= 7) return;
    const disponibles = DIAS_SEMANA.filter((d) => !dias.find((dd) => dd.diaSemana === d.value));
    if (disponibles.length === 0) return;
    setDias([...dias, { id: `d_${Date.now()}`, nombre: `Día ${dias.length + 1}`, diaSemana: disponibles[0].value, ejercicios: [] }]);
  };

  const agregarEjADia = (diaId: string, ejercicioId: string) => {
    const ej = ejercicios.find((e) => e.id === ejercicioId);
    if (!ej) return;
    setDias(dias.map((d) =>
      d.id === diaId
        ? { ...d, ejercicios: [...d.ejercicios, crearEjercicioRutina(ej)] }
        : d
    ));
    setDiaActivo(null);
    setSearchText("");
  };

  const ejercicioTutoriales = useAppStore((s) => s.ejercicioTutoriales);

  const crearEjercicioRutina = (ej: { id: string; nombre: string; grupoMuscular: string }) => {
    const s = 4, r = 10, ds = 90;
    return {
      id: `ej_${Date.now()}`,
      ejercicioId: ej.id,
      ejercicioNombre: ej.nombre,
      grupoMuscular: ej.grupoMuscular,
      series: s, reps: r, descansoSegundos: ds, videoUrl: ejercicioTutoriales[ej.id] ?? "",
      seriesPorSemana: [s, s, s, s],
      repsPorSemana: [r, r, r, r],
      descansoPorSemana: [ds, ds, ds, ds],
      notasPorSemana: ["", "", "", ""],
    };
  };

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNombre.trim()) return;
    const ej = agregarEjercicioPersonalizado({ nombre: customNombre.trim(), grupoMuscular: customMuscle, equipo: customEquipment });
    if (customTutorial.trim()) {
      setEjercicioTutorial(ej.id, customTutorial.trim());
    }
    setCustomNombre("");
    setCustomTutorial("");
    setShowCustomEj(false);
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    if (!nombre.trim() || dias.length === 0) return;
    if (!noAssign && alumnoIds.length === 0) return;
    const coachId = useAppStore.getState().usuarioActual?.id ?? "";
    const wi = indicacionesSemanales.some((s) => s.trim()) ? indicacionesSemanales : undefined;
    setSaving(true);
    setSaveError("");
    try {
      if (noAssign) {
        if (editandoId) {
          deleteUnassignedRoutine(editandoId);
          await eliminarRutina(editandoId);
        }
        await saveUnassignedRoutine({ coachId, nombre: nombre.trim(), alumnoId: "", mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), dias, activa: true, indicacionesSemanales: wi });
        setShowBuilder(false);
        resetForm();
      } else if (editandoId) {
        const oldPlan = rutinas.find((r) => r.id === editandoId);
        const oldStudentId = oldPlan?.alumnoId;
        const storeEjercicios = useAppStore.getState().ejercicios;
        for (const studentId of alumnoIds) {
          if (studentId === oldStudentId) {
            await updateWorkoutPlan(editandoId, nombre.trim(), "", dias as any, storeEjercicios, wi);
            useAppStore.setState((s) => ({
              rutinas: s.rutinas.map((r) =>
                r.id === editandoId ? { ...r, nombre: nombre.trim(), dias, indicacionesSemanales: wi } : r
              ),
            }));
          } else {
            await asignarRutina({ coachId, nombre: nombre.trim(), alumnoId: studentId, mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), dias, activa: true, indicacionesSemanales: wi });
          }
        }
        if (oldStudentId && !alumnoIds.includes(oldStudentId)) {
          await eliminarRutina(editandoId);
        }
        setShowBuilder(false);
        resetForm();
      } else {
        for (const id of alumnoIds) {
          await asignarRutina({ coachId, nombre: nombre.trim(), alumnoId: id, mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), dias, activa: true, indicacionesSemanales: wi });
        }
        setShowBuilder(false);
        resetForm();
      }
    } catch (e: any) {
      setSaveError(e?.message ?? "Error al guardar la rutina. Revisá la consola.");
      console.error("Error saving routine:", e);
    }
    setSaving(false);
  };

  const muscleGroups = [...new Set(ejercicios.map((e) => e.grupoMuscular))];

  const exportRutinaExcel = useCallback((r: Rutina, alumnosList: typeof alumnos) => {
    if (window.innerWidth < 768) { alert("La funcionalidad para exportar a excel funciona unicamente en computadora"); return; }
    const a = alumnosList.find((al) => al.id === r.alumnoId);
    const ext = /iPad|iPhone|iPod/.test(navigator.userAgent) ? ".xlsx" : ".xls";
    const fileName = `${r.nombre.replace(/[^a-zA-Z0-9_ ]/g, "")}_${a?.nombre?.replace(/[^a-zA-Z0-9_ ]/g, "") ?? "alumno"}${ext}`;
    const th = (label: string, bg = "#1e293b") => `<th style="background:${bg};color:#fff;padding:6px 8px;font-weight:600;border:1px solid #334155;font-size:11px">${label}</th>`;
    const td = (val: string | number, opts = "") => `<td style="padding:4px 6px;border:1px solid #e2e8f0;font-size:11px"${opts}>${val}</td>`;
    const sep = () => `<td style="width:20px;border:0;background:transparent"></td>`;
    const WEEK_LABELS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
    const WEEK_COLORS = ["#1e293b", "#2d1b4e", "#1b3a2e", "#3a1b1b"];

    let html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${r.nombre}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table style="border-collapse:collapse;font-family:Arial,sans-serif">`;

    r.dias.forEach((dia) => {
      // Day header row spanning all week groups + separators
      const colSpan = 5 * 4 + 3; // 4 weeks × 5 columns + 3 separators
      html += `<tr><td style="background:#f8fafc;font-weight:700;padding:8px 10px;border:1px solid #e2e8f0;font-size:13px;color:#1e293b" colspan="${colSpan}">${dia.nombre} — ${dia.diaSemana}</td></tr>`;

      // Week title row
      html += `<tr>`;
      for (let w = 0; w < 4; w++) {
        html += `<td style="background:${WEEK_COLORS[w]};color:#fff;padding:6px 8px;font-weight:700;border:1px solid #334155;font-size:12px;text-align:center" colspan="5">${WEEK_LABELS[w]}</td>`;
        if (w < 3) html += sep();
      }
      html += `</tr>`;

      // Week sub-headers
      html += `<tr>`;
      for (let w = 0; w < 4; w++) {
        html += th("Músculo", WEEK_COLORS[w]);
        html += th("Ejercicio", WEEK_COLORS[w]);
        html += th("Video", WEEK_COLORS[w]);
        html += th("Descanso", WEEK_COLORS[w]);
        html += th("Indicaciones", WEEK_COLORS[w]);
        if (w < 3) html += sep();
      }
      html += `</tr>`;

      // Exercise rows
      dia.ejercicios.forEach((ej) => {
        html += `<tr>`;
        for (let w = 0; w < 4; w++) {
          const series = (ej.seriesPorSemana ?? [ej.series, ej.series, ej.series, ej.series])[w];
          const reps = (ej.repsPorSemana ?? [ej.reps, ej.reps, ej.reps, ej.reps])[w];
          const desc = (ej.descansoPorSemana ?? [ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos])[w];
          const notas = (ej.notasPorSemana ?? ["", "", "", ""])[w];
          html += td(ej.grupoMuscular);
          html += td(`${ej.ejercicioNombre} ${series}×${reps}`);
          html += td(ej.videoUrl ? `<a href="${ej.videoUrl}" target="_blank">${ej.videoUrl}</a>` : "");
          html += td(`${desc}s`);
          html += td(notas || "");
          if (w < 3) html += sep();
        }
        html += `</tr>`;
      });

      html += `<tr><td style="height:6px;border:0" colspan="${colSpan}"></td></tr>`;
    });

    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const resetForm = useCallback(() => {
    setNombre("");
    setAlumnoIds(alumnoIdParam ? [alumnoIdParam] : []);
    setNoAssign(false);
    setDias([]);
    setEditandoId(null);
    setIndicacionesSemanales(["", "", "", ""]);
    setSearchText("");
    setMuscleFilter("");
    setDiaActivo(null);
    setNotasAbiertas(new Set());
    setSemanaActiva({});
    setShowCustomEj(false);
    setCustomNombre("");
    setCustomMuscle("Pecho");
    setCustomEquipment("Bodyweight");
    setAlumnoSearch("");
    setShowAssignPicker(null);
    setAssignSearch("");
    useAppStore.getState().setPageDraft("rutinas", {});
  }, [alumnoIdParam]);
  const [alumnoSearch, setAlumnoSearch] = useState("");
  const [busquedaAlumno, setBusquedaAlumno] = useState("");

  // Auto-open editor when coming from alumno detail page
  useEffect(() => {
    if (!editRutinaId) return;
    const rutina = rutinas.find((r) => r.id === editRutinaId);
    if (rutina) abrirEditor(rutina);
  }, [editRutinaId]);

  // Save draft when modal closes (cancel or save), not on every keystroke
  useEffect(() => {
    if (!showBuilder) {
      useAppStore.getState().setPageDraft("rutinas", {});
    }
  }, [showBuilder]);
  const rutinasFiltradas = busquedaAlumno
    ? rutinas.filter((r) => {
        const a = alumnos.find((al) => al.id === r.alumnoId);
        return a?.nombre.toLowerCase().includes(busquedaAlumno.toLowerCase());
      })
    : rutinas;

  return (
    <>
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Rutinas</h1>
          <p className="text-white/40 mt-1">Creá y asigná rutinas de entrenamiento a tus alumnos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn-ghost text-sm !px-2" title="Sincronizar datos">
            <span className={`inline-block ${syncing ? "animate-spin" : ""}`}>⟳</span>
          </button>
          <button onClick={() => { resetForm(); setShowBuilder(true); }} className="btn-primary">+ Nueva Rutina</button>
        </div>
      </div>

      <input className="input max-w-md" placeholder="Buscar alumno..." value={busquedaAlumno} onChange={(e) => setBusquedaAlumno(e.target.value)} />

      {/* Unassigned Routines */}
      {unassignedRoutines.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Rutinas Guardadas (sin asignar)</h2>
          <div className="grid gap-3">
            {unassignedRoutines.map((r) => (
              <div key={r.id} className="card-hover" onClick={() => setExpandidoId(expandidoId === r.id ? null : r.id)}>
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                  <h3 className="text-white font-semibold truncate min-w-0">{r.nombre}</h3>
                  <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); exportRutinaExcel(r, alumnos); }} className="btn-ghost text-[10px] !px-1.5 !py-1"><img src="/excel.png" alt="Excel" className="w-3.5 h-3.5 inline-block align-middle" /></button>
                    <button onClick={() => { resetForm(); setNombre(r.nombre); setDias(r.dias); setIndicacionesSemanales(r.indicacionesSemanales ?? ["", "", "", ""]); setEditandoId(r.id); setNoAssign(true); setShowBuilder(true); }} className="btn-ghost text-[10px] !px-1.5 !py-1">Editar</button>
                    <button onClick={() => setShowAssignPicker(showAssignPicker === r.id ? null : r.id)} className="text-[10px] font-semibold bg-accent text-bg-primary px-2 py-1 rounded-lg hover:brightness-110 transition-all whitespace-nowrap">Asignar</button>
                    <button onClick={async () => { if (await confirm("¿Eliminar esta rutina guardada?")) deleteUnassignedRoutine(r.id); }} className="btn-danger text-[10px] !px-1.5 !py-1">✕</button>
                  </div>
                  <p className="text-sm text-white/40 truncate col-span-2">{r.dias.length} días · {r.dias.reduce((s, d) => s + d.ejercicios.length, 0)} ejercicios</p>
                </div>
                {expandidoId === r.id && (
                  <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                    {r.dias.map((dia) => (
                      <div key={dia.id}>
                        <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{dia.nombre} · {dia.diaSemana}</p>
                        <div className="space-y-1.5">
                          {dia.ejercicios.map((ej) => (
                            <div key={ej.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/30 font-mono">{ej.grupoMuscular.slice(0, 3).toUpperCase()}</span>
                                <span className="text-white/80">{ej.ejercicioNombre}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-white/40 text-xs">{ej.series}×{ej.reps} · {ej.descansoSegundos}s</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Student Modal */}
      {showAssignPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAssignPicker(null)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Asignar rutina</h3>
              <button onClick={() => setShowAssignPicker(null)} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>
            <input className="input mb-3" placeholder="Buscar alumno..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} autoFocus />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {alumnos.filter((a) => a.nombre.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">No hay alumnos</p>
              )}
              {alumnos.filter((a) => a.nombre.toLowerCase().includes(assignSearch.toLowerCase())).map((a) => (
                <button key={a.id} onClick={async () => { await assignUnassignedRoutine(showAssignPicker, a.id); setShowAssignPicker(null); setAssignSearch(""); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors">
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {rutinasFiltradas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Rutinas Asignadas</h2>
          <div className="grid gap-3">
            {rutinasFiltradas.map((r) => {
              const a = alumnos.find((al) => al.id === r.alumnoId);
              return (
                <div key={r.id} className="card-hover" onClick={() => setExpandidoId(expandidoId === r.id ? null : r.id)}>
                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <h3 className="text-white font-semibold truncate min-w-0">{r.nombre}</h3>
                    <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); exportRutinaExcel(r, alumnos); }} className="btn-ghost text-[10px] !px-1.5 !py-1"><img src="/excel.png" alt="Excel" className="w-3.5 h-3.5 inline-block align-middle" /></button>
                      <button onClick={() => abrirEditor(r)} className="btn-ghost text-[10px] !px-1.5 !py-1">Editar</button>
                      <button onClick={async () => { if (await confirm("¿Desasignar esta rutina?")) unassignRoutine(r.id); }} className="text-[10px] font-semibold bg-red-500/90 text-white px-2 py-1 rounded-lg hover:brightness-110 transition-all whitespace-nowrap">Desasignar</button>
                      <button onClick={async () => { if (await confirm("¿Eliminar esta rutina?")) eliminarRutina(r.id); }} className="btn-danger text-[10px] !px-1.5 !py-1">✕</button>
                    </div>
                    <p className="text-sm text-white/40 truncate col-span-2">Para {(a?.apodo || a?.nombre) ?? "?"} · {r.dias.length} días · {r.dias.reduce((s, d) => s + d.ejercicios.length, 0)} ejercicios</p>
                  </div>
                  {expandidoId === r.id && (
                    <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                      {(() => { const wi = getCurrentWeekIndex(r.creadoEn); return (
                      <>
                        <p className="text-xs text-white/30 text-center">Semana {wi + 1}/4</p>
                        {r.dias.map((dia) => (
                        <div key={dia.id}>
                          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{dia.nombre} · {dia.diaSemana}</p>
                          <div className="space-y-1.5">
                            {dia.ejercicios.map((ej) => {
                              const s = ejercicioWeekValue(ej, "series", ej.series, wi);
                              const r = ejercicioWeekValue(ej, "reps", ej.reps, wi);
                              const d = ejercicioWeekValue(ej, "descanso", ej.descansoSegundos, wi);
                              return (
                              <div key={ej.id} className="flex items-center justify-between text-sm bg-white/[0.03] rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/30 font-mono">{ej.grupoMuscular.slice(0, 3).toUpperCase()}</span>
                                  <span className="text-white/80">{ej.ejercicioNombre}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-white/40 text-xs">{s}×{r} · {d}s</span>
                                  {ej.videoUrl && <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer" className="bg-accent/10 text-accent font-medium rounded-lg px-2 py-1 text-[10px] hover:bg-accent/20 transition-all border border-accent/20">Tutorial</a>}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                        ))}
                      </>); })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rutinas.length === 0 && !showBuilder && (
        <div className="card text-center py-12">
          <p className="text-white/30">Aún no hay rutinas. Creá la primera.</p>
        </div>
      )}
      {busquedaAlumno && rutinasFiltradas.length === 0 && rutinas.length > 0 && (
        <div className="card text-center py-12">
          <p className="text-white/30">No hay rutinas para &quot;{busquedaAlumno}&quot;</p>
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-6 overflow-y-auto" onClick={() => { setShowBuilder(false); resetForm(); }}>
          <div className="card w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? "Editar Rutina" : "Nueva Rutina"}</h2>
              <button onClick={() => { setShowBuilder(false); resetForm(); }} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label block mb-1.5">Nombre de la rutina</label>
                <input className="input" placeholder="Ej: Push Pull Legs" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="label block mb-1.5">Alumnos (seleccioná uno o más)</label>
                <input className="input mb-2 text-sm" placeholder="Buscar alumno..." value={alumnoSearch} onChange={(e) => setAlumnoSearch(e.target.value)} />
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 glass rounded-xl border border-white/[0.06]">
                  {alumnos.filter((a) => a.nombre.toLowerCase().includes(alumnoSearch.toLowerCase())).map((a) => (
                    <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer text-sm">
                      <input type="checkbox" checked={alumnoIds.includes(a.id)} onChange={() => setAlumnoIds(alumnoIds.includes(a.id) ? alumnoIds.filter((id) => id !== a.id) : [...alumnoIds, a.id])} className="accent-accent" />
                      <span className="text-white/80">{a.apodo || a.nombre}</span>
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-2 px-1">
                  <input type="checkbox" checked={noAssign} onChange={(e) => { setNoAssign(e.target.checked); if (e.target.checked) setAlumnoIds([]); }} className="accent-accent" />
                  <span className="text-sm text-white/60">No asignar por ahora (guardar como borrador)</span>
                </label>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Días</h3>
                <button onClick={agregarDia} disabled={dias.length >= 7} className="btn-ghost text-sm">+ Agregar Día</button>
              </div>

              {dias.length === 0 && (
                <div className="card text-center py-10">
                  <p className="text-white/30">Hacé clic en &quot;+ Agregar Día&quot; para empezar</p>
                </div>
              )}

              {dias.map((dia) => (
                <div key={dia.id} className="glass rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] bg-white/[0.02]">
                    <select className="input w-36 text-sm" value={dia.diaSemana} onChange={(e) => setDias(dias.map((d) => d.id === dia.id ? { ...d, diaSemana: e.target.value as WeekDay } : d))}>
                      {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <input className="input flex-1 text-sm" placeholder="Ej: Push" value={dia.nombre} onChange={(e) => setDias(dias.map((d) => d.id === dia.id ? { ...d, nombre: e.target.value } : d))} />
                    <button onClick={() => setDias(dias.filter((d) => d.id !== dia.id))} className="text-white/20 hover:text-red-400 text-xs p-1">✕</button>
                  </div>

                  <div className="p-4">
                    {/* Ejercicios agregados */}
                    <div className="space-y-2 mb-3">
                      {dia.ejercicios.map((ej) => {
                        const sw = semanaActiva[ej.id] ?? 0;
                        const setSw = (w: number) => setSemanaActiva({ ...semanaActiva, [ej.id]: w });
                        const upd = (partial: Record<string, any>) => setDias(dias.map((d) =>
                          d.id === dia.id ? { ...d, ejercicios: d.ejercicios.map((ex) =>
                            ex.id === ej.id ? { ...ex, ...partial } : ex
                          )} : d
                        ));
                        const updWeek = (field: string, arrKey: string, val: number | string) => {
                          const arr = (ej as any)[arrKey] ?? [4, 4, 4, 4];
                          arr[sw] = val;
                          upd({ [field]: val, [arrKey]: arr });
                        };
                        return (
                        <div key={ej.id} className="flex flex-col sm:flex-row sm:items-start gap-2 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.05]">
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{ej.ejercicioNombre}</p>
                              <p className="text-[10px] text-white/30">{ej.grupoMuscular}</p>
                            </div>
                            <div className="flex gap-1 mt-1.5 sm:mt-0">
                              {[0, 1, 2, 3].map((w) => (
                                <button key={w} type="button" onClick={() => setSw(w)}
                                  className={`text-[10px] px-2 py-0.5 rounded transition-all ${sw === w ? "bg-accent text-bg-primary font-semibold" : "bg-white/[0.06] text-white/40 hover:text-white/70"}`}>
                                  Sem {w + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <input type="text" inputMode="numeric" className="input !w-12 !text-center !text-xs !py-1.5"
                                value={(ej.seriesPorSemana ?? [ej.series, ej.series, ej.series, ej.series])[sw]}
                                onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseInt(v); if (!isNaN(n)) updWeek("series", "seriesPorSemana", n); }} />
                              <span className="text-[10px] text-white/30">×</span>
                              <input type="text" inputMode="numeric" className="input !w-12 !text-center !text-xs !py-1.5"
                                value={(ej.repsPorSemana ?? [ej.reps, ej.reps, ej.reps, ej.reps])[sw]}
                                onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseInt(v); if (!isNaN(n)) updWeek("reps", "repsPorSemana", n); }} />
                              <span className="text-[10px] text-white/30">reps</span>
                              <input type="text" inputMode="numeric" className="input !w-14 !text-center !text-xs !py-1.5"
                                value={(ej.descansoPorSemana ?? [ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos, ej.descansoSegundos])[sw]}
                                onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseInt(v); if (!isNaN(n)) updWeek("descansoSegundos", "descansoPorSemana", n); }} />
                              <span className="text-[10px] text-white/30">s</span>
                              <button onClick={() => setDias(dias.map((d) => d.id === dia.id ? { ...d, ejercicios: d.ejercicios.filter((ex) => ex.id !== ej.id) } : d))}
                                className="text-white/20 hover:text-red-400 text-xs ml-auto sm:ml-1">✕</button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {ej.videoUrl && <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent shrink-0" title={ej.videoUrl}>▶</a>}
                              <input className="input flex-1 min-w-0 !text-[10px] !py-1.5" placeholder="URL video" value={ej.videoUrl ?? ""}
                                onChange={(e) => upd({ videoUrl: e.target.value })} />
                              <button onClick={() => setNotasAbiertas((prev) => { const next = new Set(prev); if (next.has(ej.id)) next.delete(ej.id); else next.add(ej.id); return next; })}
                                className={`text-xs px-1.5 py-1 rounded shrink-0 transition-all ${(ej.notasPorSemana ?? ["", "", "", ""])[sw] ? "text-accent bg-accent/10" : "text-white/30 hover:text-white/60"}`} title="Indicaciones del ejercicio">📝</button>
                            </div>
                            {notasAbiertas.has(ej.id) && (
                              <textarea className="input !text-xs !py-1.5 w-full resize-none" rows={2} placeholder="Ej: mantener codo pegado al cuerpo..."
                                value={(ej.notasPorSemana ?? ["", "", "", ""])[sw]}
                                onChange={(e) => updWeek("notas", "notasPorSemana", e.target.value)} />
                            )}
                          </div>
                        </div>
                        );})}
                    </div>

                    {/* Exercise Search */}
                    <div>
                      <button onClick={() => setDiaActivo(diaActivo === dia.id ? null : dia.id)}
                        className="btn-ghost text-xs border border-dashed border-white/[0.1] w-full py-2 rounded-lg">
                        {diaActivo === dia.id ? "Cancelar" : "+ Agregar ejercicio"}
                      </button>

                      {diaActivo === dia.id && (
                        <div className="mt-2">
                          {/* Filters */}
                          <div className="flex flex-col sm:flex-row gap-2 mb-2">
                            <input className="input text-sm flex-1" placeholder="Buscar ejercicio..." value={searchText}
                              onChange={(e) => setSearchText(e.target.value)} autoFocus />
                            <div className="flex gap-2">
                              <select className="input flex-1 sm:w-36 text-sm" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
                                <option value="">Todos</option>
                                {muscleGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <button onClick={() => setShowCustomEj(true)} className="btn-ghost text-sm px-2 shrink-0" title="Crear ejercicio">+</button>
                            </div>
                          </div>

                          {/* Results */}
                          <div className="max-h-52 overflow-y-auto space-y-1 bg-surface rounded-xl p-2 border border-white/[0.1]">
                            {filteredEjercicios.map((ej) => (
                              <button key={ej.id} onClick={() => agregarEjADia(dia.id, ej.id)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.08] active:bg-white/[0.04] transition-all text-left border border-transparent hover:border-white/[0.06]">
                                <div>
                                  <p className="text-sm text-white font-medium">{ej.nombre}</p>
                                  <p className="text-[11px] text-white/40">{ej.grupoMuscular} · {ej.equipo}</p>
                                </div>
                                <span className="text-xs text-accent font-semibold bg-accent/10 px-3 py-1 rounded-full">+ Agregar</span>
                              </button>
                            ))}
                            {filteredEjercicios.length === 0 && (
                              <div className="text-center py-6">
                                <p className="text-sm text-white/40 mb-2">No se encontraron ejercicios</p>
                                <button onClick={() => { setShowCustomEj(true); }}
                                  className="text-sm text-accent hover:underline font-medium">+ Crear ejercicio personalizado</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setShowIndicaciones(true)}
              className="btn-ghost text-sm w-full border border-dashed border-white/[0.1] py-2 rounded-lg mb-2">
              {indicacionesSemanales.some((s) => s.trim()) ? "✏️ Indicaciones semanales" : "+ Agregar indicaciones semanales"}
            </button>

            {saveError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{saveError}</div>
            )}
            <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
              <button onClick={() => { setShowBuilder(false); resetForm(); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={!nombre || (!noAssign && alumnoIds.length === 0) || dias.length === 0 || saving} className="btn-primary flex-1">
                {saving ? "Guardando..." : editandoId ? "Guardar Cambios" : noAssign ? "Guardar (sin asignar)" : "Asignar Rutina" + (alumnoIds.length > 1 ? ` (${alumnoIds.length} alumnos)` : "")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIndicaciones && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowIndicaciones(false)}>
          <div className="fixed inset-0 bg-black/70" />
          <div className="card w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Indicaciones por semana</h3>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((w) => (
                <div key={w}>
                  <label className="text-xs text-white/50 mb-1 block">Semana {w + 1}</label>
                  <textarea className="input !text-sm !py-2 w-full resize-none" rows={2}
                    placeholder="Ej: Hacer 3 series de 10 reps al fallo"
                    value={indicacionesSemanales[w]}
                    onChange={(e) => setIndicacionesSemanales(indicacionesSemanales.map((s, i) => i === w ? e.target.value : s))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowIndicaciones(false)} className="btn-primary flex-1">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Exercise Modal */}
      {showCustomEj && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6" onClick={() => setShowCustomEj(false)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Crear Ejercicio</h2>
            <form onSubmit={handleCreateCustomExercise} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Nombre</label>
                <input className="input" placeholder="Ej: Press con mancuernas" value={customNombre} onChange={(e) => setCustomNombre(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label block mb-1.5">Grupo muscular</label>
                <select className="input" value={customMuscle} onChange={(e) => setCustomMuscle(e.target.value)}>
                  {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">Equipo</label>
                <select className="input" value={customEquipment} onChange={(e) => setCustomEquipment(e.target.value)}>
                  {["Barra", "Mancuerna", "Máquina", "Cable", "Bodyweight", "Banda", "Kettlebell", "Otro"].map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">Tutorial <span className="text-white/20">(opcional)</span></label>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/30 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  <input className="input flex-1" placeholder="https://youtube.com/..." value={customTutorial} onChange={(e) => setCustomTutorial(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCustomEj(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      {ToastUI}
    </>
  );
}
