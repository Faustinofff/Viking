"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useConfirmToast } from "@/components/toast";

export default function RedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const red = useAppStore((s) => s.redes.find((r) => r.id === id));
  const alumnos = useAppStore((s) => s.alumnos);
  const agregarAlumno = useAppStore((s) => s.agregarAlumno);
  const agregarAlumnoARed = useAppStore((s) => s.agregarAlumnoARed);
  const eliminarAlumno = useAppStore((s) => s.eliminarAlumno);
  const { confirm, toast, ToastUI } = useConfirmToast();
  const [showModal, setShowModal] = useState(false);
  const [showExistingModal, setShowExistingModal] = useState(false);

  // New student form
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [objetivo, setObjetivo] = useState("hipertrofia");
  const [objetivoCustom, setObjetivoCustom] = useState("");
  const [plan, setPlan] = useState<"solo_rutina" | "rutina_nutricion" | "acompanamiento_total">("solo_rutina");

  if (!red) {
    return (
      <div className="p-8 text-center">
        <p className="text-white/40 mb-4">Red no encontrada</p>
        <Link href="/dashboard/redes" className="btn-primary">Volver</Link>
      </div>
    );
  }

  const alumnosRed = alumnos.filter((a) => red.alumnoIds.includes(a.id));
  const alumnosDisponibles = alumnos.filter((a) => !red.alumnoIds.includes(a.id));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !edad || !peso) return;
    try {
      await agregarAlumno({
        coachId: red.coachId,
        redId: red.id,
        nombre: nombre.trim(),
        email: email.trim(),
        edad: parseInt(edad),
        peso: parseFloat(peso),
        objetivo: objetivo === "personalizado" ? objetivoCustom.trim() || "Personalizado" : objetivo,
        plan,
        notas: "",
      });
    } catch (err: any) {
      toast(err.message || "Error al agregar alumno", "error");
      return;
    }
    setNombre("");
    setEmail("");
    setEdad("");
    setPeso("");
    setShowModal(false);
  };

  const handleAddExisting = async (alumnoId: string) => {
    agregarAlumnoARed(red.id, alumnoId);
  };

  const handleRemove = async (alumnoId: string) => {
    if (await confirm("¿Quitar este alumno de la red?")) {
      useAppStore.setState((state) => {
        const nuevas = state.redes.map((r) =>
          r.id === red.id ? { ...r, alumnoIds: r.alumnoIds.filter((aid) => aid !== alumnoId) } : r
        );
        // Save to localStorage
        try { localStorage.setItem("viking_redes", JSON.stringify(nuevas)); } catch {}
        return {
          redes: nuevas,
          alumnos: state.alumnos.map((a) =>
            a.id === alumnoId ? { ...a, redId: "" } : a
          ),
        };
      });
    }
  };

  const planLabel = (p: string) => {
    switch (p) {
      case "solo_rutina": return "Solo Rutina";
      case "rutina_nutricion": return "Rutina + Nutrición";
      case "acompanamiento_total": return "Acompañamiento Total";
      default: return p;
    }
  };

  return (
    <>
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/redes" className="text-sm text-white/30 hover:text-white/50">← Redes</Link>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{red.nombre}</h1>
          <p className="text-white/40 mt-1">{red.tipo === "gimnasio" ? "🏋️ Presencial" : "💻 Online"} · {alumnosRed.length} alumnos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExistingModal(true)} className="btn-secondary">+ Agregar Existente</button>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Nuevo Alumno</button>
        </div>
      </div>

      {alumnosRed.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-white/30 text-lg mb-2">Esta red está vacía</p>
          <p className="text-white/20 text-sm mb-4">Agregá tu primer alumno para empezar</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowExistingModal(true)} className="btn-secondary">+ Agregar Existente</button>
            <button onClick={() => setShowModal(true)} className="btn-primary">+ Nuevo Alumno</button>
          </div>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-4 label">Alumno</th>
                  <th className="text-left px-6 py-4 label">Edad</th>
                  <th className="text-left px-6 py-4 label">Peso</th>
                  <th className="text-left px-6 py-4 label">Objetivo</th>
                  <th className="text-left px-6 py-4 label">Plan</th>
                  <th className="text-right px-6 py-4 label"></th>
                </tr>
              </thead>
              <tbody>
                {alumnosRed.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/alumnos/${a.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-medium text-accent">{a.nombre[0]}</div>
                        <div>
                          <p className="text-sm font-medium text-white">{a.nombre}</p>
                          <p className="text-xs text-white/40">{a.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">{a.edad} años</td>
                    <td className="px-6 py-4 text-sm text-white/60">{a.peso} kg</td>
                    <td className="px-6 py-4">
                      <span className="badge-green">{a.objetivo === "definicion" ? "Definición" : a.objetivo === "hipertrofia" ? "Hipertrofia" : a.objetivo === "volumen" ? "Volumen" : a.objetivo === "fuerza" ? "Fuerza" : a.objetivo === "mantenimiento" ? "Mantenimiento" : a.objetivo}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50">{planLabel(a.plan)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleRemove(a.id)} className="btn-danger text-xs !px-2 !py-1">Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Alumno */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Nuevo Alumno</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label block mb-1">Nombre</label>
                  <input className="input" placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <label className="label block mb-1">Email</label>
                  <input type="email" className="input" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="label block mb-1">Edad</label>
                  <input type="number" className="input" placeholder="28" value={edad} onChange={(e) => setEdad(e.target.value)} required />
                </div>
                <div>
                  <label className="label block mb-1">Peso (kg)</label>
                  <input type="number" step="0.1" className="input" placeholder="75" value={peso} onChange={(e) => setPeso(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label block mb-1">Objetivo</label>
                <select className="input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
                  <option value="hipertrofia">Hipertrofia</option>
                  <option value="definicion">Definición</option>
                  <option value="volumen">Volumen</option>
                  <option value="fuerza">Fuerza</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="personalizado">Otro / Personalizado</option>
                </select>
                {objetivo === "personalizado" && (
                  <input
                    type="text"
                    className="input mt-2"
                    placeholder="Ej: Preparar media maratón"
                    value={objetivoCustom}
                    onChange={(e) => setObjetivoCustom(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="label block mb-1">Plan contratado</label>
                <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as any)}>
                  <option value="solo_rutina">Solo Rutina</option>
                  <option value="rutina_nutricion">Rutina + Nutrición</option>
                  <option value="acompanamiento_total">Acompañamiento Total</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Agregar Alumno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar Alumno Existente */}
      {showExistingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto" onClick={() => setShowExistingModal(false)}>
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Agregar Alumno Existente a {red.nombre}</h2>
            {alumnosDisponibles.length > 0 ? (
              <div className="space-y-1">
                {alumnosDisponibles.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => { handleAddExisting(a.id); setShowExistingModal(false); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-medium text-accent">{a.nombre[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-white">{a.nombre}</p>
                        <p className="text-xs text-white/40">{a.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-accent font-semibold">+ Agregar</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/30 mb-2">No hay alumnos disponibles</p>
                <p className="text-white/20 text-xs">Todos tus alumnos ya están en esta red.</p>
              </div>
            )}
            <div className="flex gap-2 pt-4 border-t border-white/[0.06] mt-4">
              <button onClick={() => setShowExistingModal(false)} className="btn-secondary flex-1">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
      {ToastUI}
    </>
  );
}
