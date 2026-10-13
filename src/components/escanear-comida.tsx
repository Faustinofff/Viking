"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Camera, Check, Loader2, Trash2 } from "lucide-react";
import MealScanModal, { MacroBloque, type ItemUI } from "./meal-scan-modal";
import { calcularMacros, type Macros } from "@/lib/food-catalog";
import {
  FRANJAS,
  MAX_USOS_POR_FRANJA,
  fechaHoyAR,
  getMealLog,
  getScanUses,
  saveMealLogEntry,
  removeMealLogEntry,
  sumarTotalesDia,
  getMealDays,
  saveMealDay,
  getSemanaAR,
  type MealLogDia,
  type MealLogEntry,
  type MealDaySummary,
  type FranjaId,
} from "@/lib/meal-log";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatFecha(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  if (isNaN(d.getTime())) return key;
  return `${DIAS_LARGO[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

export default function EscanearComida({ alumnoId }: { alumnoId: string }) {
  const [log, setLog] = useState<MealLogDia>({});
  const [usos, setUsos] = useState<Record<string, number>>({});
  const [dias, setDias] = useState<Record<string, MealDaySummary>>({});
  const [cargando, setCargando] = useState(true);
  const [franjaAbierta, setFranjaAbierta] = useState<FranjaId | null>(null);
  const [diaSel, setDiaSel] = useState<string>(fechaHoyAR());
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const fecha = fechaHoyAR();

  const recargar = useCallback(async () => {
    if (!alumnoId) return;
    try {
      const [dia, u, d] = await Promise.all([
        getMealLog(alumnoId, fecha),
        getScanUses(alumnoId, fecha),
        getMealDays(alumnoId),
      ]);
      setLog(dia);
      setUsos(u);
      setDias(d);
    } finally {
      setCargando(false);
    }
  }, [alumnoId, fecha]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const registrar = async (franja: FranjaId, items: ItemUI[], totales: Macros) => {
    const entry: MealLogEntry = {
      id: `ml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      franja,
      items: items.map((it) => ({
        nombre: it.nombre,
        gramos: it.gramos,
        macros: calcularMacros(it.food, it.gramos),
      })),
      totales,
      creadoEn: new Date().toISOString(),
    };
    const dia = await saveMealLogEntry(alumnoId, fecha, entry);
    setLog({ ...dia });
    setUsos(await getScanUses(alumnoId, fecha));
    setFranjaAbierta(null);
  };

  const eliminar = async (franja: string, id: string) => {
    const dia = await removeMealLogEntry(alumnoId, fecha, franja, id);
    setLog({ ...dia });
  };

  const registrarDia = async () => {
    const totales = sumarTotalesDia(log);
    const comidas = FRANJAS.flatMap((f) =>
      (log[f.id] ?? []).map((e) => ({ franja: f.id as string, label: f.label, items: e.items, totales: e.totales }))
    );
    if (comidas.length === 0) return;
    setGuardando(true);
    try {
      const summary: MealDaySummary = {
        fecha,
        kcal: totales.kcal,
        proteina: totales.proteina,
        carbohidratos: totales.carbohidratos,
        grasas: totales.grasas,
        comidaCount: comidas.length,
        comidas,
        registradoEn: new Date().toISOString(),
      };
      const map = await saveMealDay(alumnoId, summary);
      setDias({ ...map });
      setDiaSel(fecha);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } finally {
      setGuardando(false);
    }
  };

  const totalesHoy = sumarTotalesDia(log);
  const franjaActual = FRANJAS.find((f) => f.id === franjaAbierta) ?? null;
  const semana = getSemanaAR();
  const hayComidasHoy = FRANJAS.some((f) => (log[f.id] ?? []).length > 0);

  const detalle: MealDaySummary | null =
    dias[diaSel] ??
    (diaSel === fecha && hayComidasHoy
      ? {
          fecha,
          ...totalesHoy,
          comidaCount: FRANJAS.reduce((n, f) => n + (log[f.id] ?? []).length, 0),
          comidas: FRANJAS.flatMap((f) =>
            (log[f.id] ?? []).map((e) => ({ franja: f.id as string, label: f.label, items: e.items, totales: e.totales }))
          ),
          registradoEn: "",
        }
      : null);

  return (
    <div className="p-5 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/alumno/nutricion" className="p-1.5 -ml-1.5 text-white/50 hover:text-white" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white">Escanear mi comida</h1>
          <p className="text-white/40 text-xs">Identifica calorías y macros de tu plato</p>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-10 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {FRANJAS.map((f) => {
              const entries = log[f.id] ?? [];
              const usados = usos[f.id] ?? 0;
              const restantes = Math.max(0, MAX_USOS_POR_FRANJA - usados);
              const sinUsos = restantes <= 0;
              return (
                <div key={f.id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      sinUsos ? "text-amber-400 bg-amber-400/10" : "text-white/40 bg-white/5"
                    }`}>
                      {restantes}/{MAX_USOS_POR_FRANJA} análisis
                    </span>
                  </div>

                  {entries.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {entries.map((e) => (
                        <div key={e.id} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-white/60 flex-1">
                              {e.items.map((it) => `${it.nombre} ${it.gramos}g`).join(", ")}
                            </p>
                            <button
                              type="button"
                              onClick={() => eliminar(f.id, e.id)}
                              className="text-white/25 hover:text-red-400 shrink-0"
                              aria-label="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-white/40 mt-1">
                            {e.totales.kcal} kcal · C {e.totales.carbohidratos}g · P {e.totales.proteina}g · G {e.totales.grasas}g
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setFranjaAbierta(f.id)}
                    disabled={sinUsos}
                    className="btn-secondary w-full text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {sinUsos ? "Sin análisis disponibles" : `Escanear ${f.label}`}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="card">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Resumen de hoy</p>
            <div className="grid grid-cols-2 gap-2">
              <MacroBloque label="Calorías" valor={totalesHoy.kcal} unidad="kcal" color="text-white" />
              <MacroBloque label="Carbohidratos" valor={totalesHoy.carbohidratos} unidad="g" color="text-amber-400" />
              <MacroBloque label="Proteína" valor={totalesHoy.proteina} unidad="g" color="text-[#00e5ff] drop-shadow-[0_0_10px_rgba(0,229,255,0.55)]" />
              <MacroBloque label="Grasa" valor={totalesHoy.grasas} unidad="g" color="text-orange-400" />
            </div>

            <button
              type="button"
              onClick={registrarDia}
              disabled={!hayComidasHoy || guardando}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : guardado ? (
                <>
                  <Check className="w-4 h-4" /> ¡Comidas de hoy registradas!
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" /> Registrar comidas de hoy
                </>
              )}
            </button>
            {!hayComidasHoy && (
              <p className="text-[11px] text-white/30 text-center mt-2">
                Escaneá al menos una comida para poder registrar el día.
              </p>
            )}
          </div>

          <div className="card">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Tu semana</p>
            <div className="flex items-center justify-between">
              {semana.map((d) => {
                const registrado = !!dias[d.key];
                const seleccionado = d.key === diaSel;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDiaSel(d.key)}
                    className="flex flex-col items-center gap-1.5"
                    aria-label={formatFecha(d.key)}
                  >
                    <span
                      className={
                        registrado
                          ? "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-cyan-400 text-bg-primary shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                          : `w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border ${
                              d.isToday ? "border-cyan-400 text-cyan-400" : "border-cyan-400/40 text-white/40"
                            }`
                      }
                      style={seleccionado ? { outline: "2px solid rgba(255,255,255,0.5)", outlineOffset: "2px" } : undefined}
                    >
                      {d.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-sm font-semibold text-white capitalize">{formatFecha(diaSel)}</p>
              {detalle ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <MacroBloque label="Calorías" valor={detalle.kcal} unidad="kcal" color="text-white" />
                    <MacroBloque label="Carbohidratos" valor={detalle.carbohidratos} unidad="g" color="text-amber-400" />
                    <MacroBloque label="Proteína" valor={detalle.proteina} unidad="g" color="text-[#00e5ff] drop-shadow-[0_0_10px_rgba(0,229,255,0.55)]" />
                    <MacroBloque label="Grasa" valor={detalle.grasas} unidad="g" color="text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    {detalle.comidas.map((c, i) => (
                      <div key={i} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{c.label}</p>
                        <p className="text-xs text-white/60 mt-0.5">
                          {c.items.map((it) => `${it.nombre} ${it.gramos}g`).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                  {dias[diaSel] ? (
                    <p className="text-[11px] text-emerald-400/80 text-center">Día registrado ✓</p>
                  ) : (
                    <p className="text-[11px] text-white/30 text-center">Así va tu día (sin registrar todavía)</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/30 text-center py-6">Sin comidas registradas este día.</p>
              )}
            </div>
          </div>
        </>
      )}

      {franjaActual && (
        <MealScanModal
          franja={franjaActual.id}
          franjaLabel={franjaActual.label}
          usosRestantes={Math.max(0, MAX_USOS_POR_FRANJA - (usos[franjaActual.id] ?? 0))}
          onCerrar={() => setFranjaAbierta(null)}
          onRegistrar={(items, totales) => registrar(franjaActual.id, items, totales)}
        />
      )}
    </div>
  );
}
