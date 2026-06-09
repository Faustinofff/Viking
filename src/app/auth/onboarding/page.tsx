"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { createProfile, saveStudentWeight, saveStudentPhone } from "@/lib/data";

export default function OnboardingPage() {
  const router = useRouter();
  const setUsuario = useAppStore((s) => s.setUsuario);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rolGuardado, setRolGuardado] = useState<"coach" | "alumno" | null>(null);
  const [user, setUser] = useState<any>(null);
  const [peso, setPeso] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    const rol = localStorage.getItem("viking_rol") as "coach" | "alumno" | null;
    if (!rol) {
      setLoading(false);
      return;
    }
    localStorage.removeItem("viking_rol");

    const init = async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      setUser(u);
      setRolGuardado(rol);
      if (rol === "coach") {
        await finalizar(u, rol, "");
        return;
      }
      setLoading(false);
    };
    init();
  }, []);

  const finalizar = async (u: any, rol: "coach" | "alumno", phone: string) => {
    setLoading(true);
    setError("");
    try {
      const nombre = (u.user_metadata?.full_name as string) ?? u.email?.split("@")[0] ?? "Usuario";
      await supabase.auth.updateUser({ data: { nombre, rol } });
      await createProfile(u.id, u.email ?? "", nombre, rol);

      if (rol === "alumno") {
        if (phone) {
          try { await saveStudentPhone(u.id, phone); } catch {}
        }
      }

      setUsuario({ id: u.id, nombre, email: u.email ?? "", rol, telefono: phone || undefined });
      router.push(rol === "coach" ? "/dashboard" : "/alumno");
    } catch {
      setError("Error al crear tu perfil. Intentalo de nuevo.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rolGuardado) return;

    const pesoNum = parseFloat(peso);
    if (!peso || isNaN(pesoNum) || pesoNum <= 0) {
      setError("Ingresá un peso válido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const u = user;
      const nombre = (u.user_metadata?.full_name as string) ?? u.email?.split("@")[0] ?? "Usuario";
      await supabase.auth.updateUser({ data: { nombre, rol: rolGuardado } });
      await createProfile(u.id, u.email ?? "", nombre, rolGuardado);

      try { await saveStudentWeight(u.id, pesoNum); } catch {}
      if (telefono.trim()) {
        try { await saveStudentPhone(u.id, telefono.trim()); } catch {}
      }

      try {
        const existing = JSON.parse(localStorage.getItem("viking_alumnos_peso") || "{}");
        existing[u.id] = { peso: pesoNum, fecha: new Date().toISOString().split("T")[0] };
        localStorage.setItem("viking_alumnos_peso", JSON.stringify(existing));
      } catch {}

      setUsuario({ id: u.id, nombre, email: u.email ?? "", rol: rolGuardado, telefono: telefono.trim() || undefined });
      router.push("/alumno");
    } catch {
      setError("Error al crear tu perfil. Intentalo de nuevo.");
      setLoading(false);
    }
  };

  if (loading && rolGuardado === "coach") {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-lg bg-accent animate-pulse mx-auto mb-4" />
          <p className="text-white/40 text-sm">Preparando tu cuenta...</p>
        </div>
      </div>
    );
  }

  if (rolGuardado === "alumno" && !loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/Viking.png" alt="Viking" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Bienvenido a Viking</h1>
            <p className="text-white/40 text-sm mt-1">Contanos un poco de vos para empezar</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label block mb-1.5">Peso actual (kg)</label>
              <input type="number" step="0.1" min="20" max="300" className="input" placeholder="Ej: 75"
                value={peso} onChange={(e) => setPeso(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label block mb-1.5">Teléfono (opcional)</label>
              <input type="tel" className="input" placeholder="Ej: +54 11 5555-1234"
                value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              <p className="text-[11px] text-white/30 mt-1">Así tu coach puede contactarte por WhatsApp</p>
            </div>
            <button type="submit" className="btn-primary w-full">Comenzar</button>
          </form>
        </div>
      </div>
    );
  }

  const handleSeleccionarRol = async (rol: "coach" | "alumno") => {
    const u = await getCurrentUser();
    if (!u) { router.replace("/login"); return; }
    await finalizar(u, rol, "");
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-accent items-center justify-center mb-4">
          <img src="/Viking.png" alt="Viking" className="w-10 h-10 object-contain" />
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Bienvenido a Viking</h1>
        <p className="text-white/40 text-sm mb-2">No encontramos tu rol. ¿Cómo querés usar la plataforma?</p>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-3 mt-4">
          <button onClick={() => handleSeleccionarRol("coach")} disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? "Preparando..." : "Soy coach"}
          </button>
          <button onClick={() => handleSeleccionarRol("alumno")} disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white">
            Soy alumno
          </button>
        </div>
      </div>
    </div>
  );
}
