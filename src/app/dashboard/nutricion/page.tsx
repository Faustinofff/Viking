"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore, type WeekDay, type Comida, type DiaComida, type PlanNutricional } from "@/lib/store";
import { useConfirmToast } from "@/components/toast";

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

function planToGrupos(plan: Pick<PlanNutricional, "dias">): GrupoDias[] {
  const grupos: GrupoDias[] = [];
  for (const dia of plan.dias) {
    const existente = grupos.find((g) => comidasIguales(g.comidas, dia.comidas));
    if (existente) {
      existente.dias.push(dia.diaSemana);
    } else {
      grupos.push({ id: `gr_${Date.now()}_${grupos.length}`, dias: [dia.diaSemana], comidas: dia.comidas.map((c) => ({ ...c, alimentos: [...c.alimentos] })) });
    }
  }
  return grupos;
}

export default function NutricionPage() {
  const searchParams = useSearchParams();
  const alumnoIdParam = searchParams.get("alumnoId");

  const alumnos = useAppStore((s) => s.alumnos);
  const planes = useAppStore((s) => s.planesNutricionales);
  const unassignedPlans = useAppStore((s) => s.unassignedPlans);
  const asignarPlan = useAppStore((s) => s.asignarPlanNutricional);
  const eliminarPlan = useAppStore((s) => s.eliminarPlanNutricional);
  const saveUnassignedPlanStore = useAppStore((s) => s.saveUnassignedPlan);
  const assignUnassignedPlan = useAppStore((s) => s.assignUnassignedPlan);
  const unassignPlan = useAppStore((s) => s.unassignPlan);
  const deleteUnassignedPlan = useAppStore((s) => s.deleteUnassignedPlan);
  const { confirm, ToastUI } = useConfirmToast();
  const syncCoachData = useAppStore((s) => s.syncCoachData);

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    await syncCoachData();
    setSyncing(false);
  };

  const draft = useRef(useAppStore.getState().pageDrafts.nutricion ?? {}).current;

  const [showBuilder, setShowBuilder] = useState(draft.showBuilder ?? false);
  const [editandoId, setEditandoId] = useState<string | null>(draft.editandoId ?? null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [showAssignPicker, setShowAssignPicker] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [nombre, setNombre] = useState(draft.nombre ?? "");
  const [alumnoIds, setAlumnoIds] = useState<string[]>(draft.alumnoIds ?? (alumnoIdParam ? [alumnoIdParam] : []));
  const [noAssign, setNoAssign] = useState(draft.noAssign ?? false);
  const [grupos, setGrupos] = useState<GrupoDias[]>(draft.grupos ?? []);
  const [saving, setSaving] = useState(false);

  // Days already used across all groups
  const diasUsados = useMemo(() =>
    grupos.flatMap((g) => g.dias),
  [grupos]);

  const abrirEditor = (plan: PlanNutricional) => {
    setNombre(plan.nombre);
    setAlumnoIds([plan.alumnoId]);
    setGrupos(planToGrupos(plan));
    setEditandoId(plan.id);
    setShowBuilder(true);
  };

  const agregarGrupo = () => {
    const disponibles = DIAS_SEMANA.filter((d) => !diasUsados.includes(d.value));
    if (disponibles.length === 0) return;
    setGrupos([...grupos, { id: `gr_${Date.now()}`, dias: [disponibles[0].value], comidas: [{ id: `c_${Date.now()}`, tipo: "desayuno", nombre: "", alimentos: [""], instrucciones: "" }] }]);
  };

  const toggleDiaEnGrupo = (grupoId: string, dia: WeekDay) => {
    setGrupos(grupos.map((g) =>
      g.id === grupoId
        ? { ...g, dias: g.dias.includes(dia) ? g.dias.filter((d) => d !== dia) : [...g.dias, dia] }
        : g
    ));
  };

  const agregarComida = (grupoId: string) => {
    setGrupos(grupos.map((g) =>
      g.id === grupoId
        ? { ...g, comidas: [...g.comidas, { id: `c_${Date.now()}`, tipo: "desayuno", nombre: "", alimentos: [""], instrucciones: "" }] }
        : g
    ));
  };

  const updateComida = (grupoId: string, comidaId: string, field: string, value: any) => {
    setGrupos(grupos.map((g) =>
      g.id === grupoId
        ? {
            ...g,
            comidas: g.comidas.map((c) =>
              c.id === comidaId
                ? field === "alimentos" ? { ...c, alimentos: [value] } : { ...c, [field]: value }
                : c
            ),
          }
        : g
    ));
  };

  const eliminarComida = (grupoId: string, comidaId: string) => {
    setGrupos(grupos.map((g) => g.id === grupoId ? { ...g, comidas: g.comidas.filter((c) => c.id !== comidaId) } : g));
  };

  const eliminarGrupo = (grupoId: string) => {
    setGrupos(grupos.filter((g) => g.id !== grupoId));
  };

  // Flatten groups into individual DiaComida entries for save
  const gruposADias = (): DiaComida[] => {
    return grupos.flatMap((g) =>
      g.dias.map((dia) => ({
        id: `${g.id}_${dia}`,
        diaSemana: dia,
        comidas: g.comidas.map((c) => ({ ...c })),
      }))
    );
  };

  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  // Save to store + localStorage on unmount
  useEffect(() => () => {
    useAppStore.getState().setPageDraft("nutricion", { showBuilder, editandoId, nombre, alumnoIds, grupos });
  });
  const planesFiltrados = busquedaAlumno
    ? planes.filter((p) => {
        const a = alumnos.find((al) => al.id === p.alumnoId);
        return a?.nombre.toLowerCase().includes(busquedaAlumno.toLowerCase());
      })
    : planes;

  const handleSave = async () => {
    if (!nombre.trim() || grupos.length === 0) return;
    if (!noAssign && alumnoIds.length === 0) return;
    const dias = gruposADias();
    const coachId = (useAppStore.getState().usuarioActual?.id) ?? "";
    setSaving(true);
    try {
      if (noAssign) {
        if (editandoId) {
          deleteUnassignedPlan(editandoId);
        }
        await saveUnassignedPlanStore({ coachId, nombre: nombre.trim(), alumnoId: "", dias, activo: true });
        setShowBuilder(false);
        setEditandoId(null);
        setGrupos([]);
        setNombre("");
        setAlumnoIds([]);
        setNoAssign(false);
      } else {
        for (const id of alumnoIds) {
          await asignarPlan({ coachId, nombre: nombre.trim(), alumnoId: id, dias, activo: true });
        }
        if (editandoId) {
          await eliminarPlan(editandoId);
        }
        setNombre("");
        setAlumnoIds([]);
        setNoAssign(false);
        setGrupos([]);
        setEditandoId(null);
        setShowBuilder(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const exportPlanExcel = useCallback((p: PlanNutricional, alumnosList: typeof alumnos) => {
    const a = alumnosList.find((al) => al.id === p.alumnoId);
    const fileName = `${p.nombre.replace(/[^a-zA-Z0-9_ ]/g, "")}_${a?.nombre?.replace(/[^a-zA-Z0-9_ ]/g, "") ?? "alumno"}.xls`;
    const th = (label: string) => `<th style="background:#1e293b;color:#fff;padding:8px 12px;font-weight:600;border:1px solid #334155;font-size:13px">${label}</th>`;
    const td = (val: string, opts = "") => `<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:12px"${opts}>${val.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`;
    let rows = "";
    const tipoLabel: Record<string, string> = { desayuno: "Desayuno", almuerzo: "Almuerzo", cena: "Cena", snack: "Snack", pre_entreno: "Pre-Entreno", post_entreno: "Post-Entreno" };
    p.dias.forEach((dia) => {
      rows += `<tr><td style="background:#f8fafc;font-weight:600;padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;text-transform:capitalize" colspan="4">${dia.diaSemana}</td></tr>`;
      dia.comidas.forEach((c) => {
        rows += `<tr>${td(tipoLabel[c.tipo] ?? c.tipo)}${td(c.nombre)}${td(c.alimentos.join(", "))}${td(c.instrucciones ?? "")}</tr>`;
      });
      rows += `<tr><td style="height:4px;border:0" colspan="4"></td></tr>`;
    });
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${p.nombre}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table style="border-collapse:collapse;font-family:Arial,sans-serif"><tr>${th("Comida")}${th("Plato")}${th("Alimentos")}${th("Instrucciones")}</tr>${rows}</table></body></html>`;
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

  return (
    <>
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Planes Nutricionales</h1>
          <p className="text-white/40 mt-1">Asigná qué debe comer cada alumno según su objetivo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn-ghost text-sm !px-2" title="Sincronizar datos">
            <span className={`inline-block ${syncing ? "animate-spin" : ""}`}>⟳</span>
          </button>
          <button onClick={() => setShowBuilder(true)} className="btn-primary">+ Nuevo Plan</button>
        </div>
      </div>

      <input className="input max-w-md" placeholder="Buscar alumno..." value={busquedaAlumno} onChange={(e) => setBusquedaAlumno(e.target.value)} />

      {/* Unassigned Plans */}
      {unassignedPlans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Planes Guardados (sin asignar)</h2>
          <div className="grid gap-3">
            {unassignedPlans.map((p) => (
              <div key={p.id} className="card-hover" onClick={() => setExpandidoId(expandidoId === p.id ? null : p.id)}>
                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <h3 className="text-white font-semibold truncate min-w-0">{p.nombre}</h3>
                    <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => exportPlanExcel(p, alumnos)} className="btn-ghost text-[10px] !px-1.5 !py-1">📥</button>
                      <button onClick={() => { setNombre(p.nombre); setGrupos(planToGrupos(p)); setEditandoId(p.id); setNoAssign(true); setShowBuilder(true); }} className="btn-ghost text-[10px] !px-1.5 !py-1">Editar</button>
                      <button onClick={() => setShowAssignPicker(showAssignPicker === p.id ? null : p.id)} className="text-[10px] font-semibold bg-accent text-bg-primary px-2 py-1 rounded-lg hover:brightness-110 transition-all whitespace-nowrap">Asignar</button>
                      <button onClick={async () => { if (await confirm("¿Eliminar este plan guardado?")) deleteUnassignedPlan(p.id); }} className="btn-danger text-[10px] !px-1.5 !py-1">✕</button>
                    </div>
                    <p className="text-sm text-white/40 truncate col-span-2">{p.dias.length} días · {p.dias.reduce((s, d) => s + d.comidas.length, 0)} comidas</p>
                  </div>
                {expandidoId === p.id && (
                  <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                    {p.dias.map((dia) => (
                      <div key={dia.id}>
                        <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 capitalize">{dia.diaSemana}</p>
                        <div className="space-y-2">
                          {dia.comidas.map((c) => (
                            <div key={c.id} className="bg-white/[0.03] rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{c.tipo.replace("_", " ")}</span>
                                {c.nombre && <span className="text-xs text-white/50">· {c.nombre}</span>}
                              </div>
                              <p className="text-sm text-white/70 mt-0.5">{c.alimentos.join(", ")}</p>
                              {c.instrucciones && <p className="text-xs text-white/30 mt-0.5">{c.instrucciones}</p>}
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

      {/* Assign Plan Modal */}
      {showAssignPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowAssignPicker(null); setAssignSearch(""); }}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Asignar plan</h3>
              <button onClick={() => { setShowAssignPicker(null); setAssignSearch(""); }} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>
            <input className="input mb-3" placeholder="Buscar alumno..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} autoFocus />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {alumnos.filter((a) => a.nombre.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                <p className="text-sm text-white/30 text-center py-4">No hay alumnos</p>
              )}
              {alumnos.filter((a) => a.nombre.toLowerCase().includes(assignSearch.toLowerCase())).map((a) => (
                <button key={a.id} onClick={async () => { await assignUnassignedPlan(showAssignPicker, a.id); setShowAssignPicker(null); setAssignSearch(""); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors">
                  {a.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {planesFiltrados.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Planes Asignados</h2>
          <div className="grid gap-3">
            {planesFiltrados.map((p) => {
              const alumno = alumnos.find((a) => a.id === p.alumnoId);
              const totalComidas = p.dias.reduce((s, d) => s + d.comidas.length, 0);
              return (
                <div key={p.id} className="card-hover" onClick={() => setExpandidoId(expandidoId === p.id ? null : p.id)}>
                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <h3 className="text-white font-semibold truncate min-w-0">{p.nombre}</h3>
                    <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => exportPlanExcel(p, alumnos)} className="btn-ghost text-[10px] !px-1.5 !py-1">📥</button>
                      <button onClick={() => abrirEditor(p)} className="btn-ghost text-[10px] !px-1.5 !py-1">Editar</button>
                      <button onClick={async () => { if (await confirm("¿Desasignar este plan?")) unassignPlan(p.id); }} className="btn-ghost text-[10px] !px-1.5 !py-1">Desasignar</button>
                      <button onClick={async () => { if (await confirm("¿Eliminar este plan nutricional?")) eliminarPlan(p.id); }} className="btn-danger text-[10px] !px-1.5 !py-1">✕</button>
                    </div>
                    <p className="text-sm text-white/40 truncate col-span-2">Para {alumno?.nombre ?? "?"} · {p.dias.length} días · {totalComidas} comidas</p>
                  </div>
                  {expandidoId === p.id && (
                    <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                      {p.dias.map((dia) => (
                        <div key={dia.id}>
                          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 capitalize">{dia.diaSemana}</p>
                          <div className="space-y-2">
                            {dia.comidas.map((c) => (
                              <div key={c.id} className="bg-white/[0.03] rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{c.tipo.replace("_", " ")}</span>
                                  {c.nombre && <span className="text-xs text-white/50">· {c.nombre}</span>}
                                </div>
                                <p className="text-sm text-white/70 mt-0.5">{c.alimentos.join(", ")}</p>
                                {c.instrucciones && <p className="text-xs text-white/30 mt-0.5">{c.instrucciones}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {planes.length === 0 && !showBuilder && (
        <div className="card text-center py-12">
          <p className="text-white/30">Aún no hay planes nutricionales. Creá el primero.</p>
        </div>
      )}
      {busquedaAlumno && planesFiltrados.length === 0 && planes.length > 0 && (
        <div className="card text-center py-12">
          <p className="text-white/30">No hay planes para &quot;{busquedaAlumno}&quot;</p>
        </div>
      )}

      {showBuilder && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={() => { setShowBuilder(false); setEditandoId(null); setGrupos([]); }}>
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editandoId ? "Editar Plan Nutricional" : "Nuevo Plan Nutricional"}</h2>
              <button onClick={() => { setShowBuilder(false); setEditandoId(null); setGrupos([]); }} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label block mb-1.5">Nombre del plan</label>
                <input className="input" placeholder="Ej: Plan Definición" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="label block mb-1.5">Alumnos (seleccioná uno o más)</label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 glass rounded-xl border border-white/[0.06]">
                  {alumnos.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer text-sm">
                      <input type="checkbox" checked={alumnoIds.includes(a.id)} onChange={() => setAlumnoIds(alumnoIds.includes(a.id) ? alumnoIds.filter((id) => id !== a.id) : [...alumnoIds, a.id])} className="accent-accent" />
                      <span className="text-white/80">{a.nombre}</span>
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
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Grupos de días</h3>
                <button onClick={agregarGrupo} disabled={diasUsados.length >= 7} className="btn-ghost text-sm">+ Agregar Grupo</button>
              </div>

              {grupos.map((grupo) => (
                <div key={grupo.id} className="glass rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                    <div className="flex flex-wrap gap-2">
                      {DIAS_SEMANA.map((d) => {
                        const usado = diasUsados.includes(d.value) && !grupo.dias.includes(d.value);
                        return (
                          <label key={d.value} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer text-xs transition-all ${grupo.dias.includes(d.value) ? "bg-accent/20 text-accent font-semibold" : usado ? "bg-white/[0.03] text-white/20 line-through cursor-not-allowed" : "bg-white/[0.05] text-white/50 hover:bg-white/[0.08]"}`}
                            onClick={(e) => { if (usado) e.preventDefault(); }}>
                            <input type="checkbox" checked={grupo.dias.includes(d.value)} disabled={usado}
                              onChange={() => toggleDiaEnGrupo(grupo.id, d.value)} className="sr-only" />
                            {d.label.slice(0, 3)}
                          </label>
                        );
                      })}
                    </div>
                    <button onClick={() => eliminarGrupo(grupo.id)} className="text-white/20 hover:text-red-400 text-xs p-1">✕</button>
                  </div>
                  <div className="p-4 space-y-3">
                    {grupo.comidas.map((comida) => (
                      <div key={comida.id} className="bg-white/[0.03] rounded-lg p-3 space-y-2">
                        <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                          <select className="input w-full sm:w-32 text-sm" value={comida.tipo} onChange={(e) => updateComida(grupo.id, comida.id, "tipo", e.target.value)}>
                            {TIPOS_COMIDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input className="input flex-1 text-sm w-full" placeholder="Ej: Omelette de claras" value={comida.nombre} onChange={(e) => updateComida(grupo.id, comida.id, "nombre", e.target.value)} />
                          <button onClick={() => eliminarComida(grupo.id, comida.id)} className="text-white/20 hover:text-red-400 text-xs p-1 shrink-0">✕</button>
                        </div>
                        <input className="input text-sm" placeholder="Alimentos: huevos, avena, banana..." value={comida.alimentos[0] ?? ""} onChange={(e) => updateComida(grupo.id, comida.id, "alimentos", e.target.value)} />
                        <input className="input text-sm" placeholder="Instrucciones (opcional)" value={comida.instrucciones ?? ""} onChange={(e) => updateComida(grupo.id, comida.id, "instrucciones", e.target.value)} />
                      </div>
                    ))}
                    <button onClick={() => agregarComida(grupo.id)} className="btn-ghost text-sm">+ Agregar comida</button>
                  </div>
                </div>
              ))}

              {grupos.length === 0 && (
                <p className="text-sm text-white/30 text-center py-8">Agregá al menos un grupo de días</p>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
              <button onClick={() => { setShowBuilder(false); setEditandoId(null); setGrupos([]); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={!nombre || (!noAssign && alumnoIds.length === 0) || grupos.length === 0 || saving} className="btn-primary flex-1">
                {saving ? "Guardando..." : editandoId ? "Guardar Cambios" : noAssign ? "Guardar (sin asignar)" : "Asignar Plan" + (alumnoIds.length > 1 ? ` (${alumnoIds.length} alumnos)` : "")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      {ToastUI}
    </>
  );
}
