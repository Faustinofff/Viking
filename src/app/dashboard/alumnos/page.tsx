"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAppStore, type WeekDay, type DiaRutina, type Rutina, type PlanNutricional, type DiaComida, type Comida } from "@/lib/store";
import { useConfirmToast } from "@/components/toast";
import { loadPaymentStatus, savePaymentStatus, resetMonthPayments } from "@/lib/data";

const DIAS_SEMANA: { value: WeekDay; label: string }[] = [
  { value: "lunes", label: "Lunes" },
  { value: "martes", label: "Martes" },
  { value: "miercoles", label: "Miércoles" },
  { value: "jueves", label: "Jueves" },
  { value: "viernes", label: "Viernes" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const TIPOS_COMIDA = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "cena", label: "Cena" },
  { value: "snack", label: "Snack" },
  { value: "pre_entreno", label: "Pre-Entreno" },
  { value: "post_entreno", label: "Post-Entreno" },
];

interface GrupoDias {
  id: string;
  dias: WeekDay[];
  comidas: Comida[];
}

function comidasIguales(a: Comida[], b: Comida[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((ca, i) => {
    const cb = b[i];
    if (!cb) return false;
    return ca.tipo === cb.tipo && ca.nombre === cb.nombre &&
      JSON.stringify(ca.alimentos) === JSON.stringify(cb.alimentos) &&
      (ca.instrucciones ?? "") === (cb.instrucciones ?? "");
  });
}

export default function AlumnosPage() {
  const [search, setSearch] = useState("");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [rutinaExpandida, setRutinaExpandida] = useState<string | null>(null);
  const [planExpandido, setPlanExpandido] = useState<string | null>(null);

  // Payment tracking
  const [pagos, setPagos] = useState<Record<string, boolean>>({});
  const coachId = useAppStore((s) => s.usuarioActual?.id ?? "");
  const { confirm, ToastUI } = useConfirmToast();

  useEffect(() => {
    if (!coachId) return;
    loadPaymentStatus(coachId).then(setPagos).catch(() => {});
  }, [coachId]);

  const handleTogglePago = async (studentId: string, paid: boolean) => {
    setPagos((prev) => ({ ...prev, [studentId]: paid }));
    await savePaymentStatus(coachId, studentId, paid).catch(() => {});
  };

  const handleNuevoMes = async () => {
    if (await confirm("¿Comenzar nuevo mes? Todos los alumnos quedarán como \"No pagó aún\".")) {
      const ids = alumnos.map((a) => a.id);
      const reset: Record<string, boolean> = {};
      for (const id of ids) reset[id] = false;
      setPagos(reset);
      await resetMonthPayments(coachId, ids).catch(() => {});
    }
  };

  // Editing state
  const [editRutina, setEditRutina] = useState<Rutina | null>(null);
  const [editRutinaDias, setEditRutinaDias] = useState<DiaRutina[]>([]);
  const [editPlan, setEditPlan] = useState<PlanNutricional | null>(null);
  const [editPlanGrupos, setEditPlanGrupos] = useState<GrupoDias[]>([]);
  const [diaActivo, setDiaActivo] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");

  const alumnos = useAppStore((s) => s.alumnos);
  const redes = useAppStore((s) => s.redes);
  const ejercicios = useAppStore((s) => s.ejercicios);
  const getRutinasAlumno = useAppStore((s) => s.getRutinasAlumno);
  const getPlanesAlumno = useAppStore((s) => s.getPlanesAlumno);
  const asignarRutina = useAppStore((s) => s.asignarRutina);
  const asignarPlan = useAppStore((s) => s.asignarPlanNutricional);
  const eliminarRutina = useAppStore((s) => s.eliminarRutina);
  const eliminarPlan = useAppStore((s) => s.eliminarPlanNutricional);
  const eliminarAlumno = useAppStore((s) => s.eliminarAlumno);

  const filtered = alumnos.filter((a) =>
    a.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (a.apodo && a.apodo.toLowerCase().includes(search.toLowerCase())) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRedNombre = (redId: string) => redes.find((r) => r.id === redId)?.nombre ?? "Sin red";

  const muscleGroups = [...new Set(ejercicios.map((e) => e.grupoMuscular))];
  const filteredEjercicios = ejercicios.filter((e) => {
    const matchName = e.nombre.toLowerCase().includes(searchText.toLowerCase());
    const matchMuscle = !muscleFilter || e.grupoMuscular === muscleFilter;
    return matchName && matchMuscle;
  });

  // ─── Routine edit ──────────────────────────────────────
  const abrirEditorRutina = (r: Rutina) => {
    setEditRutina(r);
    setEditRutinaDias(r.dias.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      diaSemana: d.diaSemana,
      ejercicios: d.ejercicios.map((ej) => ({ ...ej })),
    })));
  };

  const guardarRutinaEditada = async () => {
    if (!editRutina) return;
    const r = editRutina;
    await asignarRutina({ coachId: r.coachId, nombre: r.nombre, alumnoId: r.alumnoId, mes: 1, anio: 2026, dias: editRutinaDias, activa: true });
    await eliminarRutina(r.id);
    setEditRutina(null);
    setEditRutinaDias([]);
  };

  const agregarEjADia = (diaId: string, ejercicioId: string) => {
    const ej = ejercicios.find((e) => e.id === ejercicioId);
    if (!ej) return;
    setEditRutinaDias(editRutinaDias.map((d) =>
      d.id === diaId
        ? { ...d, ejercicios: [...d.ejercicios, { id: `ej_${Date.now()}`, ejercicioId: ej.id, ejercicioNombre: ej.nombre, grupoMuscular: ej.grupoMuscular, series: 4, reps: 10, descansoSegundos: 90, videoUrl: "" }] }
        : d
    ));
    setDiaActivo(null);
    setSearchText("");
  };

  const eliminarEjDeDia = (diaId: string, ejId: string) => {
    setEditRutinaDias(editRutinaDias.map((d) =>
      d.id === diaId ? { ...d, ejercicios: d.ejercicios.filter((e) => e.id !== ejId) } : d
    ));
  };

  const updateEjDia = (diaId: string, ejId: string, field: string, value: any) => {
    setEditRutinaDias(editRutinaDias.map((d) =>
      d.id === diaId ? {
        ...d,
        ejercicios: d.ejercicios.map((e) => e.id === ejId ? { ...e, [field]: value } : e),
      } : d
    ));
  };

  // ─── Nutrition edit ────────────────────────────────────
  const editPlanDiasUsados = useMemo(() => editPlanGrupos.flatMap((g) => g.dias), [editPlanGrupos]);

  const abrirEditorPlan = (p: PlanNutricional) => {
    setEditPlan(p);
    const grupos: GrupoDias[] = [];
    for (const dia of p.dias) {
      const existente = grupos.find((g) => comidasIguales(g.comidas, dia.comidas));
      if (existente) {
        existente.dias.push(dia.diaSemana);
      } else {
        grupos.push({ id: `gr_${Date.now()}_${grupos.length}`, dias: [dia.diaSemana], comidas: dia.comidas.map((c) => ({ ...c, alimentos: [...c.alimentos] })) });
      }
    }
    setEditPlanGrupos(grupos);
  };

  const guardarPlanEditado = async () => {
    if (!editPlan) return;
    const p = editPlan;
    const dias = editPlanGrupos.flatMap((g) =>
      g.dias.map((dia) => ({ id: `${g.id}_${dia}`, diaSemana: dia, comidas: g.comidas.map((c) => ({ ...c })) }))
    );
    const coachId = useAppStore.getState().usuarioActual?.id ?? p.coachId;
    await asignarPlan({ coachId, nombre: p.nombre, alumnoId: p.alumnoId, dias, activo: true });
    await eliminarPlan(p.id);
    setEditPlan(null);
    setEditPlanGrupos([]);
  };

  const toggleDiaEnGrupo = (grupoId: string, dia: WeekDay) => {
    setEditPlanGrupos(editPlanGrupos.map((g) =>
      g.id === grupoId
        ? { ...g, dias: g.dias.includes(dia) ? g.dias.filter((d) => d !== dia) : [...g.dias, dia] }
        : g
    ));
  };

  const agregarGrupoPlan = () => {
    const disponibles = DIAS_SEMANA.filter((d) => !editPlanDiasUsados.includes(d.value));
    if (disponibles.length === 0) return;
    setEditPlanGrupos([...editPlanGrupos, { id: `gr_${Date.now()}`, dias: [disponibles[0].value], comidas: [{ id: `c_${Date.now()}`, tipo: "desayuno", nombre: "", alimentos: [""], instrucciones: "" }] }]);
  };

  const eliminarGrupoPlan = (grupoId: string) => {
    setEditPlanGrupos(editPlanGrupos.filter((g) => g.id !== grupoId));
  };

  const agregarComidaA = (grupoId: string) => {
    setEditPlanGrupos(editPlanGrupos.map((g) =>
      g.id === grupoId
        ? { ...g, comidas: [...g.comidas, { id: `c_${Date.now()}`, tipo: "desayuno", nombre: "", alimentos: [""], instrucciones: "" }] }
        : g
    ));
  };

  const updateComidaP = (grupoId: string, comidaId: string, field: string, value: any) => {
    setEditPlanGrupos(editPlanGrupos.map((g) =>
      g.id === grupoId ? {
        ...g,
        comidas: g.comidas.map((c) =>
          c.id === comidaId
            ? field === "alimentos" ? { ...c, alimentos: [value] } : { ...c, [field]: value }
            : c
        ),
      } : g
    ));
  };

  const eliminarComidaP = (grupoId: string, comidaId: string) => {
    setEditPlanGrupos(editPlanGrupos.map((g) =>
      g.id === grupoId ? { ...g, comidas: g.comidas.filter((c) => c.id !== comidaId) } : g
    ));
  };

  return (
    <>
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">Alumnos</h1>
          <span className="text-xs md:text-sm text-white/30 bg-white/[0.06] px-2.5 py-0.5 rounded-full">{alumnos.length}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <button onClick={handleNuevoMes} className="btn-ghost text-xs md:text-sm shrink-0 whitespace-nowrap">📅 Comenzar nuevo mes</button>
            <Link href="/dashboard/redes" className="btn-primary text-xs md:text-sm shrink-0 whitespace-nowrap">+ Agregar</Link>
          </div>
          <input className="input w-full sm:w-auto sm:flex-1 md:max-w-xs text-sm" placeholder="Buscar alumno..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-6 py-4 label">Alumno</th>
                <th className="text-left px-6 py-4 label">Red</th>
                <th className="text-left px-6 py-4 label">Objetivo</th>
                <th className="text-left px-6 py-4 label">Plan</th>
                <th className="text-left px-6 py-4 label">Rutina</th>
                <th className="text-left px-6 py-4 label">Nutrición</th>
                <th className="text-left px-6 py-4 label">Pagó</th>
                <th className="text-right px-6 py-4 label"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const rutinas = getRutinasAlumno(a.id);
                const planesNutri = getPlanesAlumno(a.id);
                const isExpanded = expandidoId === a.id;
                return (
                  <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandidoId(isExpanded ? null : a.id)}>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-medium text-accent">{(a.apodo || a.nombre)[0]}</div>
                          <div>
                            <p className="text-sm font-medium text-white">{a.apodo || a.nombre}</p>
                            <p className="text-xs text-white/40">{a.nombre} · {a.edad} años · {a.peso} kg</p>
                          </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/50">{getRedNombre(a.redId)}</td>
                    <td className="px-6 py-4">
                      <span className="badge-green text-xs">{a.objetivo}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50">
                      {a.plan === "solo_rutina" ? "📋 Rutina" : a.plan === "rutina_nutricion" ? "📋🍽️ Rutina+Nutri" : "🏋️‍♂️ Acomp. Total"}
                    </td>
                    <td className="px-6 py-4">
                      {rutinas.length > 0 ? (
                        <span className="badge-green text-xs">{rutinas.length} activa(s)</span>
                      ) : (
                        <span className="text-xs text-white/30">Sin rutina</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {planesNutri.length > 0 ? (
                        <span className="badge-green text-xs">{planesNutri.length} activo(s)</span>
                      ) : (
                        <span className="text-xs text-white/30">Sin plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={pagos[a.id] ?? false}
                          onChange={(e) => handleTogglePago(a.id, e.target.checked)} />
                        <div className="w-9 h-5 bg-white/[0.1] rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative"></div>
                        <span className={`ml-2 text-xs font-medium ${pagos[a.id] ? "text-green-400" : "text-white/30"}`}>
                          {pagos[a.id] ? "Pagó" : "No pagó"}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/alumnos/${a.id}`} className="btn-ghost text-xs">Ver perfil</Link>
                        <button onClick={async () => {
                          if (await confirm(`¿Dar de baja a ${a.nombre}? Se eliminarán todas sus rutinas y planes nutricionales.`)) {
                            await eliminarAlumno(a.id);
                          }
                        }} className="btn-danger text-xs">Dar de baja</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((a) => {
          const rutinas = getRutinasAlumno(a.id);
          const planesNutri = getPlanesAlumno(a.id);
          return (
            <div key={a.id} className="card !p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-base font-bold text-accent shrink-0">{(a.apodo || a.nombre)[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{a.apodo || a.nombre}</p>
                  <p className="text-xs text-white/40 truncate">{a.nombre} · {a.edad} años · {a.peso} kg · {getRedNombre(a.redId)}</p>
                </div>
                <span className="badge-green text-[10px] shrink-0">{a.objetivo}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="glass rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-white/40">Plan</p>
                  <p className="text-[11px] font-semibold text-white mt-0.5 leading-tight">
                    {a.plan === "solo_rutina" ? "Rutina" : a.plan === "rutina_nutricion" ? "Rutina+Nutri" : "Total"}
                  </p>
                </div>
                <div className="glass rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-white/40">Rutinas</p>
                  <p className="text-[11px] font-semibold text-white mt-0.5">{rutinas.length > 0 ? `${rutinas.length}` : "—"}</p>
                </div>
                <div className="glass rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-white/40">Nutrición</p>
                  <p className="text-[11px] font-semibold text-white mt-0.5">{planesNutri.length > 0 ? `${planesNutri.length}` : "—"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3 px-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={pagos[a.id] ?? false}
                    onChange={(e) => handleTogglePago(a.id, e.target.checked)} />
                  <div className="w-9 h-5 bg-white/[0.1] rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative"></div>
                  <span className={`ml-2 text-xs font-medium ${pagos[a.id] ? "text-green-400" : "text-white/30"}`}>
                    {pagos[a.id] ? "Pagó" : "No pagó"}
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/dashboard/alumnos/${a.id}`} className="btn-primary text-xs flex-1 text-center py-2.5">Ver perfil</Link>
                <button onClick={async () => {
                  if (await confirm(`¿Dar de baja a ${a.nombre}? Se eliminarán todas sus rutinas y planes nutricionales.`)) {
                    await eliminarAlumno(a.id);
                  }
                }} className="btn-danger text-xs flex-1 text-center py-2.5">Dar de baja</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded student detail */}
      {expandidoId && (
        <div className="hidden md:block card">
          {(() => {
            const a = alumnos.find((al) => al.id === expandidoId);
            if (!a) return null;
            const rutinas = getRutinasAlumno(a.id);
            const planesNutri = getPlanesAlumno(a.id);
            return (
              <>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-lg font-bold text-accent">{(a.apodo || a.nombre)[0]}</div>
                      <div>
                        <h2 className="text-lg font-bold text-white">{a.apodo || a.nombre}</h2>
                        <p className="text-xs text-white/40">{a.nombre} · {a.email}</p>
                      </div>
                    </div>
                  <Link href={`/dashboard/alumnos/${a.id}`} className="btn-secondary text-xs">Perfil completo</Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ─── Rutinas ─── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Rutinas</h3>
                      <Link href={`/dashboard/rutinas?alumnoId=${a.id}`} className="btn-ghost text-xs">+ Nueva</Link>
                    </div>
                    {rutinas.length > 0 ? (
                      <div className="space-y-2">
                        {rutinas.map((r) => (
                          <div key={r.id} className="card-hover !p-3" onClick={() => setRutinaExpandida(rutinaExpandida === r.id ? null : r.id)}>
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-white">{r.nombre}</p>
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => abrirEditorRutina(r)} className="btn-ghost text-[10px] !px-1.5 !py-0.5">Editar</button>
                                <button onClick={async () => { if (await confirm("¿Eliminar esta rutina?")) eliminarRutina(r.id); }} className="btn-danger text-[10px] !px-1.5 !py-0.5">✕</button>
                              </div>
                            </div>
                            {rutinaExpandida === r.id && (
                              <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
                                {r.dias.map((dia) => (
                                  <div key={dia.id}>
                                    <p className="text-[10px] font-semibold text-accent uppercase mb-1">{dia.nombre} · {dia.diaSemana}</p>
                                    {dia.ejercicios.map((ej) => (
                                      <div key={ej.id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded px-2 py-1">
                                        <span className="text-white/70">{ej.ejercicioNombre}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-white/30">{ej.series}×{ej.reps} · {ej.descansoSegundos}s</span>
                                          {ej.videoUrl && <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer" className="bg-accent/10 text-accent font-medium rounded-lg px-2 py-1 text-[9px] hover:bg-accent/20 transition-all border border-accent/20">Tutorial</a>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30 text-center py-4">Sin rutinas asignadas</p>
                    )}
                  </div>

                  {/* ─── Nutrición ─── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Planes Nutricionales</h3>
                      <Link href={`/dashboard/nutricion?alumnoId=${a.id}`} className="btn-ghost text-xs">+ Nuevo</Link>
                    </div>
                    {planesNutri.length > 0 ? (
                      <div className="space-y-2">
                        {planesNutri.map((p) => (
                          <div key={p.id} className="card-hover !p-3" onClick={() => setPlanExpandido(planExpandido === p.id ? null : p.id)}>
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-white">{p.nombre}</p>
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => abrirEditorPlan(p)} className="btn-ghost text-[10px] !px-1.5 !py-0.5">Editar</button>
                                <button onClick={async () => { if (await confirm("¿Eliminar este plan nutricional?")) eliminarPlan(p.id); }} className="btn-danger text-[10px] !px-1.5 !py-0.5">✕</button>
                              </div>
                            </div>
                            {planExpandido === p.id && (
                              <div className="mt-2 space-y-2 border-t border-white/[0.06] pt-2">
                                {p.dias.map((dia) => (
                                  <div key={dia.id}>
                                    <p className="text-[10px] font-semibold text-accent uppercase mb-1 capitalize">{dia.diaSemana}</p>
                                    {dia.comidas.map((c) => (
                                      <div key={c.id} className="bg-white/[0.03] rounded px-2 py-1 text-xs">
                                        <span className="text-white/40 uppercase text-[9px]">{c.tipo.replace("_", " ")}</span>
                                        <p className="text-white/70">{c.alimentos.join(", ")}</p>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30 text-center py-4">Sin planes nutricionales</p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ─── Edit Routine Modal ─── */}
      {editRutina && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={() => { setEditRutina(null); setEditRutinaDias([]); setDiaActivo(null); }}>
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Editar: {editRutina.nombre}</h2>
            {editRutinaDias.map((dia) => (
              <div key={dia.id} className="glass rounded-xl border border-white/[0.06] mb-4 overflow-hidden">
                <div className="flex items-center gap-3 p-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <select className="input w-32 text-xs" value={dia.diaSemana} onChange={(e) => setEditRutinaDias(editRutinaDias.map((d) => d.id === dia.id ? { ...d, diaSemana: e.target.value as WeekDay } : d))}>
                    {DIAS_SEMANA.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  <input className="input flex-1 text-xs" placeholder="Nombre del día" value={dia.nombre} onChange={(e) => setEditRutinaDias(editRutinaDias.map((d) => d.id === dia.id ? { ...d, nombre: e.target.value } : d))} />
                </div>
                <div className="p-3 space-y-1.5">
                  {dia.ejercicios.map((ej) => (
                    <div key={ej.id} className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2 py-1.5 border border-white/[0.05]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{ej.ejercicioNombre}</p>
                        <p className="text-[9px] text-white/30">{ej.grupoMuscular}</p>
                      </div>
                      <input type="text" inputMode="numeric" className="input !w-10 !text-center !text-[10px] !py-1" value={ej.series}
                        onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseInt(v); if (!isNaN(n)) updateEjDia(dia.id, ej.id, "series", n); }} />
                      <span className="text-[9px] text-white/30">×</span>
                      <input type="text" inputMode="numeric" className="input !w-10 !text-center !text-[10px] !py-1" value={ej.reps}
                        onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseInt(v); if (!isNaN(n)) updateEjDia(dia.id, ej.id, "reps", n); }} />
                      <span className="text-[9px] text-white/30">reps</span>
                      <input type="text" inputMode="numeric" className="input !w-12 !text-center !text-[10px] !py-1" value={ej.descansoSegundos}
                        onChange={(e) => { const v = e.target.value; const n = v === "" ? 0 : parseInt(v); if (!isNaN(n)) updateEjDia(dia.id, ej.id, "descansoSegundos", n); }} />
                      <span className="text-[9px] text-white/30">s</span>
                      {ej.videoUrl && <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent" title={ej.videoUrl}>▶</a>}
                      <input className="input !w-20 !text-[9px] !py-1" placeholder="URL video" value={ej.videoUrl ?? ""}
                        onChange={(e) => updateEjDia(dia.id, ej.id, "videoUrl", e.target.value)} />
                      <button onClick={() => eliminarEjDeDia(dia.id, ej.id)} className="text-white/20 hover:text-red-400 text-[10px] ml-0.5">✕</button>
                    </div>
                  ))}
                  <button onClick={() => setDiaActivo(diaActivo === dia.id ? null : dia.id)} className="btn-ghost text-[10px] border border-dashed border-white/[0.1] w-full py-1.5 rounded-lg mt-1">
                    {diaActivo === dia.id ? "Cancelar" : "+ Agregar ejercicio"}
                  </button>
                  {diaActivo === dia.id && (
                    <div className="mt-1">
                      <div className="flex gap-1.5 mb-1.5">
                        <input className="input text-[10px] flex-1" placeholder="Buscar..." value={searchText} onChange={(e) => setSearchText(e.target.value)} autoFocus />
                        <select className="input w-28 text-[10px]" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
                          <option value="">Todos</option>
                          {muscleGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-0.5 bg-surface rounded-xl p-1.5 border border-white/[0.1]">
                        {filteredEjercicios.map((ej) => (
                          <button key={ej.id} onClick={() => agregarEjADia(dia.id, ej.id)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.08] text-left">
                            <div>
                              <p className="text-[11px] text-white font-medium">{ej.nombre}</p>
                              <p className="text-[9px] text-white/40">{ej.grupoMuscular}</p>
                            </div>
                            <span className="text-[10px] text-accent font-semibold">+</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
              <button onClick={() => { setEditRutina(null); setEditRutinaDias([]); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={guardarRutinaEditada} className="btn-primary flex-1">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Nutrition Modal ─── */}
      {editPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={() => { setEditPlan(null); setEditPlanGrupos([]); }}>
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Editar: {editPlan.nombre}</h2>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Grupos de días</h3>
                <button onClick={agregarGrupoPlan} disabled={editPlanDiasUsados.length >= 7} className="btn-ghost text-sm">+ Agregar Grupo</button>
              </div>

              {editPlanGrupos.map((grupo) => (
                <div key={grupo.id} className="glass rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS_SEMANA.map((d) => {
                        const usado = editPlanDiasUsados.includes(d.value) && !grupo.dias.includes(d.value);
                        return (
                          <label key={d.value} className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-[10px] transition-all ${grupo.dias.includes(d.value) ? "bg-accent/20 text-accent font-semibold" : usado ? "bg-white/[0.03] text-white/20 line-through cursor-not-allowed" : "bg-white/[0.05] text-white/50 hover:bg-white/[0.08]"}`}
                            onClick={(e) => { if (usado) e.preventDefault(); }}>
                            <input type="checkbox" checked={grupo.dias.includes(d.value)} disabled={usado}
                              onChange={() => toggleDiaEnGrupo(grupo.id, d.value)} className="sr-only" />
                            {d.label.slice(0, 3)}
                          </label>
                        );
                      })}
                    </div>
                    <button onClick={() => eliminarGrupoPlan(grupo.id)} className="text-white/20 hover:text-red-400 text-[10px] p-1">✕</button>
                  </div>
                  <div className="p-3 space-y-2">
                    {grupo.comidas.map((c) => (
                      <div key={c.id} className="bg-white/[0.03] rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <select className="input w-28 text-[10px]" value={c.tipo} onChange={(e) => updateComidaP(grupo.id, c.id, "tipo", e.target.value)}>
                            {TIPOS_COMIDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input className="input flex-1 text-[10px]" placeholder="Nombre" value={c.nombre} onChange={(e) => updateComidaP(grupo.id, c.id, "nombre", e.target.value)} />
                          <button onClick={() => eliminarComidaP(grupo.id, c.id)} className="text-white/20 hover:text-red-400 text-[10px]">✕</button>
                        </div>
                        <input className="input text-[10px]" placeholder="Alimentos..." value={c.alimentos[0] ?? ""} onChange={(e) => updateComidaP(grupo.id, c.id, "alimentos", e.target.value)} />
                        <input className="input text-[10px]" placeholder="Instrucciones (opcional)" value={c.instrucciones ?? ""} onChange={(e) => updateComidaP(grupo.id, c.id, "instrucciones", e.target.value)} />
                      </div>
                    ))}
                    <button onClick={() => agregarComidaA(grupo.id)} className="btn-ghost text-[10px] border border-dashed border-white/[0.1] w-full py-1.5 rounded-lg">+ Agregar comida</button>
                  </div>
                </div>
              ))}

              {editPlanGrupos.length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">Agregá al menos un grupo de días</p>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
              <button onClick={() => { setEditPlan(null); setEditPlanGrupos([]); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={guardarPlanEditado} disabled={editPlanGrupos.length === 0} className="btn-primary flex-1">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
    {ToastUI}
  </>
  );
}
