"use client";
import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useConfirmToast } from "@/components/toast";

export default function RedesPage() {
  const redes = useAppStore((s) => s.redes);
  const agregarRed = useAppStore((s) => s.agregarRed);
  const eliminarRed = useAppStore((s) => s.eliminarRed);
  const { confirm, ToastUI } = useConfirmToast();
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"gimnasio" | "online">("gimnasio");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    agregarRed(nombre.trim(), tipo);
    setNombre("");
    setShowModal(false);
  };

  return (
    <>
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Redes de Entrenamiento</h1>
          <p className="text-white/40 mt-1">Grupos de alumnos organizados por gimnasio o modalidad.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm !px-3 !py-1.5 mt-0.5">+ Nueva Red</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {redes.map((red) => (
          <Link key={red.id} href={`/dashboard/redes/${red.id}`} className="card-hover flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">
              {red.tipo === "gimnasio" ? "🏋️" : "💻"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold">{red.nombre}</h3>
              <p className="text-sm text-white/40 mt-0.5">
                {red.tipo === "gimnasio" ? "Presencial" : "Online"} · {red.alumnoIds.length} alumnos
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {red.alumnoIds.map((aid) => {
                  const a = useAppStore.getState().alumnos.find((al) => al.id === aid);
                  return a ? (
                    <span key={aid} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-white/50">
                      <span className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-medium text-accent">{(a.apodo || a.nombre)[0]}</span>
                      {(a.apodo || a.nombre).split(" ")[0]}
                    </span>
                  ) : null;
                })}
                {red.alumnoIds.length === 0 && (
                  <span className="text-xs text-white/20">Sin alumnos aún</span>
                )}
              </div>
            </div>
            <button onClick={async (e) => { e.preventDefault(); if (await confirm("¿Eliminar esta red?")) eliminarRed(red.id); }} className="text-white/20 hover:text-red-400 text-xs p-1">✕</button>
          </Link>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Nueva Red</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Nombre de la red</label>
                <input className="input" placeholder="Ej: Gym Sportclub, Alumnos Online" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div>
                <label className="label block mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTipo("gimnasio")} className={`flex-1 p-3 rounded-xl border text-sm transition-all ${tipo === "gimnasio" ? "bg-accent/10 border-accent/30 text-accent" : "border-white/[0.08] text-white/50 hover:border-white/20"}`}>
                    🏋️ Presencial
                  </button>
                  <button type="button" onClick={() => setTipo("online")} className={`flex-1 p-3 rounded-xl border text-sm transition-all ${tipo === "online" ? "bg-accent/10 border-accent/30 text-accent" : "border-white/[0.08] text-white/50 hover:border-white/20"}`}>
                    💻 Online
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Crear Red</button>
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
