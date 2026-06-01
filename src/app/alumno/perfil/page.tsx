"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

export default function StudentProfilePage() {
  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const coaches = useAppStore((s) => s.coaches);
  const actualizarTelefono = useAppStore((s) => s.actualizarTelefono);
  const actualizarNombre = useAppStore((s) => s.actualizarNombre);

  const alumno = alumnos.find((a) => a.email === usuario?.email);
  let coach = alumno?.coachId ? coaches[alumno.coachId] : null;
  if (!coach) {
    const all = Object.values(coaches);
    if (all.length === 1) coach = all[0] as any;
    else if (all.length > 1 && alumno?.coachId) {
      const match = all.find((c: any) => c.id === alumno.coachId);
      if (match) coach = match as any;
    }
  }

  const [editNombre, setEditNombre] = useState(false);
  const [nombreInput, setNombreInput] = useState(usuario?.nombre ?? "");
  const [telefonoInput, setTelefonoInput] = useState(usuario?.telefono ?? "");

  const guardarNombre = () => {
    if (nombreInput.trim()) actualizarNombre(nombreInput.trim());
    setEditNombre(false);
  };

  return (
    <div className="p-5 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Mi Perfil</h1>
        <p className="text-white/40 text-sm mt-0.5">Tus datos personales</p>
      </div>

      <div className="card space-y-4">
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
                <p className="text-lg font-bold text-white">{usuario?.nombre}</p>
                <button onClick={() => { setNombreInput(usuario?.nombre ?? ""); setEditNombre(true); }} className="text-[10px] text-white/20 hover:text-white/40">Editar nombre</button>
              </div>
            )}
            <p className="text-xs text-white/40">{usuario?.email}</p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          <label className="label block mb-1.5">Teléfono (WhatsApp)</label>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="+54 11 1234-5678" value={telefonoInput} onChange={(e) => setTelefonoInput(e.target.value)} />
            <button onClick={() => actualizarTelefono(telefonoInput)} className="btn-primary text-xs">Guardar</button>
          </div>
          <p className="text-[10px] text-white/20 mt-1">Tu coach va a tener acceso a este número</p>
        </div>
      </div>

      {coach && (
        <div className="card">
          <p className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Tu Coach</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-sm font-bold text-accent">{coach.nombre[0]}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{coach.nombre}</p>
              {coach.email && <p className="text-xs text-white/40">{coach.email}</p>}
            </div>
            {coach.telefono && (
              <a href={`https://wa.me/${coach.telefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hola ${coach.nombre}, tengo una consulta`)}`}
                target="_blank" rel="noopener noreferrer" className="btn-primary text-xs !px-3 flex items-center gap-1">
                <span>💬</span> WhatsApp
              </a>
            )}
          </div>
          {!coach.telefono && <p className="text-xs text-white/20 mt-2">El coach aún no registró su número</p>}
        </div>
      )}

      {!coach && (
        <div className="card text-center py-6">
          <p className="text-sm text-white/30">No tenés un coach asignado</p>
          <p className="text-xs text-white/20 mt-1">Estás en modo independiente</p>
        </div>
      )}
    </div>
  );
}
