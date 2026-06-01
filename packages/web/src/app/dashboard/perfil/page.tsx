"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

export default function CoachProfilePage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const actualizarTelefono = useAppStore((s) => s.actualizarTelefono);
  const actualizarNombre = useAppStore((s) => s.actualizarNombre);
  const actualizarCoachEnAlumnos = useAppStore((s) => s.actualizarCoachEnAlumnos);

  const [editNombre, setEditNombre] = useState(false);
  const [nombreInput, setNombreInput] = useState(usuario?.nombre ?? "");
  const [telefonoInput, setTelefonoInput] = useState(usuario?.telefono ?? "");

  const guardarNombre = () => {
    if (nombreInput.trim()) {
      actualizarNombre(nombreInput.trim());
      setTimeout(() => actualizarCoachEnAlumnos(), 0);
    }
    setEditNombre(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Mi Perfil</h1>
        <p className="text-white/40 mt-1">Tus datos personales como coach</p>
      </div>

      <div className="card space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center text-2xl font-bold text-accent">{usuario?.nombre?.[0]}</div>
          <div className="flex-1">
            {editNombre ? (
              <div className="flex gap-2">
                <input className="input text-sm flex-1" value={nombreInput} onChange={(e) => setNombreInput(e.target.value)} autoFocus />
                <button onClick={guardarNombre} className="btn-primary text-xs">Guardar</button>
                <button onClick={() => setEditNombre(false)} className="btn-secondary text-xs">Cancelar</button>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold text-white">{usuario?.nombre}</p>
                <button onClick={() => { setNombreInput(usuario?.nombre ?? ""); setEditNombre(true); }} className="text-xs text-white/20 hover:text-white/40">Editar nombre</button>
              </div>
            )}
            <p className="text-xs text-white/40">{usuario?.email}</p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <label className="label block mb-1.5">Teléfono (WhatsApp)</label>
          <p className="text-xs text-white/20 mb-2">Este número será visible para tus alumnos en su perfil</p>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="+54 11 1234-5678" value={telefonoInput} onChange={(e) => setTelefonoInput(e.target.value)} />
            <button onClick={() => { actualizarTelefono(telefonoInput); setTimeout(() => actualizarCoachEnAlumnos(), 0); }} className="btn-primary text-xs">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
