"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore, type Ejercicio } from "@/lib/store";
import { useConfirmToast } from "@/components/toast";

const MUSCLE_GROUPS = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps",
  "Cuádriceps", "Isquiotibiales", "Gemelos", "Abdomen", "Glúteos", "Full Body"
];

export default function EjerciciosPage() {
  const ejercicios = useAppStore((s) => s.ejercicios);
  const agregarEjercicioPersonalizado = useAppStore((s) => s.agregarEjercicioPersonalizado);
  const eliminarEjercicioPersonalizado = useAppStore((s) => s.eliminarEjercicioPersonalizado);

  const draft = useRef(useAppStore.getState().pageDrafts.ejercicios ?? {}).current;

  const [search, setSearch] = useState(draft.search ?? "");
  const [muscleFilter, setMuscleFilter] = useState(draft.muscleFilter ?? "");
  const [showForm, setShowForm] = useState(draft.showForm ?? false);
  const [nombre, setNombre] = useState(draft.nombre ?? "");
  const [grupoMuscular, setGrupoMuscular] = useState(draft.grupoMuscular ?? "Pecho");
  const [equipo, setEquipo] = useState(draft.equipo ?? "Bodyweight");
  const { confirm, ToastUI } = useConfirmToast();

  const customEjercicios = ejercicios.filter((e) => e.id.startsWith("ej_"));
  const globalEjercicios = ejercicios.filter((e) => !e.id.startsWith("ej_"));

  const filtered = ejercicios.filter((e) => {
    const matchName = e.nombre.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = !muscleFilter || e.grupoMuscular === muscleFilter;
    return matchName && matchMuscle;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    agregarEjercicioPersonalizado({ nombre: nombre.trim(), grupoMuscular, equipo });
    setNombre("");
    setShowForm(false);
  };

  const muscleGroups = [...new Set(ejercicios.map((e) => e.grupoMuscular))];
  // Save to store + localStorage on unmount
  useEffect(() => () => {
    useAppStore.getState().setPageDraft("ejercicios", { search, muscleFilter, showForm, nombre, grupoMuscular, equipo });
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Ejercicios</h1>
          <p className="text-white/40 mt-1">Gestioná tu biblioteca de ejercicios.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo Ejercicio</button>
      </div>

      <div className="flex gap-2">
        <input className="input max-w-md" placeholder="Buscar ejercicio..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-44" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
          <option value="">Todos los grupos</option>
          {muscleGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {customEjercicios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Tus Ejercicios</h2>
          <div className="grid gap-2">
            {filtered.filter((e) => e.id.startsWith("ej_")).map((ej) => (
              <div key={ej.id} className="card-hover flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{ej.nombre}</p>
                  <p className="text-sm text-white/40">{ej.grupoMuscular} · {ej.equipo}</p>
                </div>
                <button onClick={async () => { if (await confirm("¿Eliminar este ejercicio?")) eliminarEjercicioPersonalizado(ej.id); }} className="text-white/20 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Ejercicios Globales</h2>
        <div className="grid gap-2">
          {filtered.filter((e) => !e.id.startsWith("ej_")).map((ej) => (
            <div key={ej.id} className="card-hover">
              <p className="text-white font-medium">{ej.nombre}</p>
              <p className="text-sm text-white/40">{ej.grupoMuscular} · {ej.equipo}</p>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Nuevo Ejercicio</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label block mb-1.5">Nombre</label>
                <input className="input" placeholder="Ej: Press con mancuernas" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label block mb-1.5">Grupo muscular</label>
                <select className="input" value={grupoMuscular} onChange={(e) => setGrupoMuscular(e.target.value)}>
                  {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-1.5">Equipo</label>
                <select className="input" value={equipo} onChange={(e) => setEquipo(e.target.value)}>
                  {["Barra", "Mancuerna", "Máquina", "Cable", "Bodyweight", "Banda", "Kettlebell", "Otro"].map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ToastUI}
    </div>
  );
}
