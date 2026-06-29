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
  const ejercicioTutoriales = useAppStore((s) => s.ejercicioTutoriales);
  const setEjercicioTutorial = useAppStore((s) => s.setEjercicioTutorial);

  const draft = useRef(useAppStore.getState().pageDrafts.ejercicios ?? {}).current;

  const [search, setSearch] = useState(draft.search ?? "");
  const [muscleFilter, setMuscleFilter] = useState(draft.muscleFilter ?? "");
  const [showForm, setShowForm] = useState(draft.showForm ?? false);
  const [nombre, setNombre] = useState(draft.nombre ?? "");
  const [grupoMuscular, setGrupoMuscular] = useState(draft.grupoMuscular ?? "Pecho");
  const [equipo, setEquipo] = useState(draft.equipo ?? "Bodyweight");
  const [tutorialUrl, setTutorialUrl] = useState("");
  const [editTutorialId, setEditTutorialId] = useState<string | null>(null);
  const [editTutorialUrl, setEditTutorialUrl] = useState("");
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
    const ej = agregarEjercicioPersonalizado({ nombre: nombre.trim(), grupoMuscular, equipo });
    if (tutorialUrl.trim()) {
      setEjercicioTutorial(ej.id, tutorialUrl.trim());
    }
    setNombre("");
    setTutorialUrl("");
    setShowForm(false);
  };

  const handleEditTutorial = async (ejercicioId: string) => {
    if (!editTutorialUrl.trim()) return;
    await setEjercicioTutorial(ejercicioId, editTutorialUrl.trim());
    setEditTutorialId(null);
    setEditTutorialUrl("");
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

      <div className="grid gap-2">
        {filtered.map((ej) => {
          const hasTutorial = !!ejercicioTutoriales[ej.id];
          const isEditing = editTutorialId === ej.id;
          return (
            <div key={ej.id} className="card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{ej.nombre}</p>
                  <p className="text-sm text-white/40">{ej.grupoMuscular} · {ej.equipo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input className="input !w-52 !text-xs !py-1.5" placeholder="https://youtube.com/..." value={editTutorialUrl} onChange={(e) => setEditTutorialUrl(e.target.value)} autoFocus />
                      <button onClick={() => handleEditTutorial(ej.id)} className="btn-primary !text-[10px] !px-2 !py-1">Guardar</button>
                      <button onClick={() => setEditTutorialId(null)} className="text-white/30 hover:text-white text-xs">✕</button>
                    </div>
                  ) : (
                    <>
                      {hasTutorial && (
                        <a href={ejercicioTutoriales[ej.id]} target="_blank" rel="noopener noreferrer"
                          className="text-accent hover:text-accent/80 text-sm" title="Ver tutorial"
                          onClick={(e) => e.stopPropagation()}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </a>
                      )}
                      <button onClick={() => { setEditTutorialId(ej.id); setEditTutorialUrl(ejercicioTutoriales[ej.id] ?? ""); }}
                        className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 text-[11px] !px-2.5 !py-1 rounded-lg whitespace-nowrap font-medium">
                        {hasTutorial ? "Editar Tutorial" : "+ Tutorial"}
                      </button>
                      {ej.id.startsWith("ej_") && (
                        <button onClick={async () => { if (await confirm("¿Eliminar este ejercicio?")) eliminarEjercicioPersonalizado(ej.id); }} className="text-white/20 hover:text-red-400 text-sm">✕</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => { setShowForm(false); setTutorialUrl(""); }}>
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
              <div>
                <label className="label block mb-1.5">Tutorial <span className="text-white/20">(opcional)</span></label>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/30 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  <input className="input flex-1" placeholder="https://youtube.com/..." value={tutorialUrl} onChange={(e) => setTutorialUrl(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setTutorialUrl(""); }} className="btn-secondary flex-1">Cancelar</button>
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
