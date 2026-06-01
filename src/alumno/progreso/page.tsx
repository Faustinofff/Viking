"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

export default function StudentProgressPage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const registrarAgua = useAppStore((s) => s.registrarAgua);
  const quitarAgua = useAppStore((s) => s.quitarAgua);
  const registrarPeso = useAppStore((s) => s.registrarPeso);
  const registrosPeso = useAppStore((s) => s.registrosPeso);
  const registrosAgua = useAppStore((s) => s.registrosAgua);
  const sesionesEntreno = useAppStore((s) => s.sesionesEntreno);

  const alumno = alumnos.find((a) => a.email === usuario?.email);
  const hoy = new Date().toISOString().split("T")[0];
  const aguaHoy = alumno
    ? registrosAgua
        .filter((r) => r.alumnoId === alumno.id && r.fecha === hoy)
        .reduce((s, r) => s + r.vasos, 0)
    : 0;
  const [showPesoModal, setShowPesoModal] = useState(false);
  const [nuevoPeso, setNuevoPeso] = useState("");

  if (!alumno) {
    return (
      <div className="p-5 max-w-lg mx-auto text-center pt-20">
        <p className="text-white/40">No tienes un perfil de alumno registrado.</p>
      </div>
    );
  }

  const pesoRegistros = registrosPeso.filter((r) => r.alumnoId === alumno.id);
  const entremosCompletados = sesionesEntreno.filter((s) => s.alumnoId === alumno.id && s.completada).length;
  const totalEntrenos = sesionesEntreno.filter((s) => s.alumnoId === alumno.id).length;
  const pesoAnterior = alumno.ultimoPesoRegistrado;

  const handleAddWater = () => {
    registrarAgua(alumno.id, 1);
  };

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Mi Progreso</h1>
        <p className="text-white/40 text-sm mt-0.5">Seguí tu evolución día a día.</p>
      </div>

      {/* Peso */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white/70 uppercase tracking-wider">Peso Corporal</p>
          <button onClick={() => setShowPesoModal(true)} className="btn-ghost text-xs">Actualizar</button>
        </div>
        <div className="text-center py-4">
          <p className="text-5xl font-extralight text-white">{alumno.peso}<span className="text-2xl text-white/30"> kg</span></p>
          {pesoAnterior && (
            <p className={`text-sm mt-2 ${alumno.peso < pesoAnterior ? "text-accent" : "text-yellow-500"}`}>
              {alumno.peso < pesoAnterior
                ? `▼ ${(pesoAnterior - alumno.peso).toFixed(1)} kg`
                : `▲ ${(alumno.peso - pesoAnterior).toFixed(1)} kg`}
              {" "}desde el último registro
            </p>
          )}
        </div>
        {pesoRegistros.length > 0 && (
          <div className="space-y-1.5 mt-3 pt-3 border-t border-white/[0.06]">
            {pesoRegistros.slice(-5).reverse().map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-white/40">{new Date(r.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                <span className="text-white font-medium">{r.peso} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agua */}
      <div className="card">
        <p className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Agua Diaria</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          {Array.from({ length: 8 }, (_, i) => (
            <button key={i} onClick={() => i < aguaHoy && quitarAgua(alumno.id, 1)} type="button" className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
              i < aguaHoy ? "bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30" : "border-white/[0.08]"
            }`}>
              {i < aguaHoy ? <span className="text-cyan-400 text-sm">💧</span> : <span className="text-white/10 text-sm">○</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">{aguaHoy}/8 vasos · {aguaHoy * 250}ml / 2000ml</p>
          <div className="flex gap-2">
            {aguaHoy > 0 && <button onClick={() => quitarAgua(alumno.id, 1)} className="btn-secondary text-xs !px-2">−1</button>}
            <button onClick={handleAddWater} disabled={aguaHoy >= 8} className="btn-primary text-xs" style={{ opacity: aguaHoy >= 8 ? 0.4 : 1 }}>
              +1 Vaso
            </button>
          </div>
        </div>
        {aguaHoy >= 8 && (
          <p className="text-xs text-accent text-center mt-3">✅ Meta cumplida — 2 litros!</p>
        )}
      </div>

      {/* Entrenos completados */}
      <div className="card">
        <p className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Entrenos</p>
        <div className="flex items-center gap-6 justify-center py-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-accent">{entremosCompletados}</p>
            <p className="text-xs text-white/40">Completados</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{totalEntrenos}</p>
            <p className="text-xs text-white/40">Totales</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {totalEntrenos > 0 ? Math.round((entremosCompletados / totalEntrenos) * 100) : 0}%
            </p>
            <p className="text-xs text-white/40">Adherencia</p>
          </div>
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
    </div>
  );
}
