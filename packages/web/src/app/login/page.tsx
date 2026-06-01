"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { signInWithGoogle } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const [error, setError] = useState("");

  useEffect(() => {
    if (usuarioActual) {
      router.replace(usuarioActual.rol === "coach" ? "/dashboard" : "/alumno");
    }
  }, [usuarioActual]);

  const handleGoogleSignIn = async (rol: "coach" | "alumno") => {
    localStorage.setItem("viking_rol", rol);
    try {
      await signInWithGoogle();
    } catch {
      setError("Error al conectar con Google");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/Viking.png" alt="Viking" className="w-32 h-32 sm:w-48 sm:h-48 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Viking</h1>
          <p className="text-white/40 text-sm mt-1">Iniciá sesión para continuar</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleGoogleSignIn("coach")}
            className="card-hover text-left flex items-center gap-4 p-5"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-xl">🏋️</div>
            <div className="flex-1">
              <p className="text-white font-semibold">Coach / Personal Trainer</p>
              <p className="text-sm text-white/40">Gestiono alumnos, rutinas y planes</p>
            </div>
            <svg className="w-5 h-5 text-white/30 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <button
            onClick={() => handleGoogleSignIn("alumno")}
            className="card-hover text-left flex items-center gap-4 p-5"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">🎯</div>
            <div className="flex-1">
              <p className="text-white font-semibold">Alumno</p>
              <p className="text-sm text-white/40">Entreno con mi coach y sigo mi plan</p>
            </div>
            <svg className="w-5 h-5 text-white/30 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <div className="text-center mt-4">
            <p className="text-xs text-white/20">Vas a iniciar sesión con tu cuenta de Google</p>
          </div>
        </div>
      </div>
    </div>
  );
}
