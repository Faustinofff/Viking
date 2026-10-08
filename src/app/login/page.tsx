"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { signInWithGoogle } from "@/lib/auth";
import AppLoader from "@/components/app-loader";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const [error, setError] = useState("");

  useEffect(() => {
    if (usuarioActual) {
      router.replace(usuarioActual.rol === "coach" ? "/dashboard" : "/alumno");
    }
  }, [usuarioActual]);

  // Guard visual: si ya existe sesión válida, Login no se pinta (ni formulario,
  // ni logo, ni botones). El redirect existente (useEffect) es el que lleva al
  // usuario a su app. Se muestra el loader real de Viking en vez de una
  // pantalla en blanco, y se mantiene idéntico el comportamiento.
  if (usuarioActual) {
    return <AppLoader />;
  }

  const handleGoogleSignIn = async (rol: "coach" | "alumno") => {
    localStorage.setItem("viking_rol", rol);
    try {
      await signInWithGoogle();
    } catch {
      setError("Error al iniciar sesión con Google");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg-primary flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-10">
          <img src="/Viking.png" alt="Viking" className="w-16 h-16 object-contain" />
          <h1 className="text-3xl font-bold text-white tracking-tight mt-4">Viking</h1>
          <p className="text-zinc-400 text-sm mt-2">Iniciá sesión para continuar</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleGoogleSignIn("coach")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#16191F] border border-emerald-500/40 hover:border-emerald-400 transition-all active:scale-[0.98] text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <GoogleIcon />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-white">Continuar como Entrenador</span>
              <span className="block text-xs text-zinc-400 mt-0.5">Gestioná alumnos, rutinas y planes</span>
            </span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/30 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <button
            onClick={() => handleGoogleSignIn("alumno")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#14161B] border border-white/10 hover:border-white/20 transition-all active:scale-[0.98] text-left"
          >
            <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
              <GoogleIcon />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-white">Continuar como Alumno</span>
              <span className="block text-xs text-zinc-400 mt-0.5">Entreno con mi coach y sigo mi plan</span>
            </span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/30 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <p className="text-zinc-500 text-xs text-center mt-8">
          Al continuar, aceptás los <span className="text-zinc-400">Términos</span> y la <span className="text-zinc-400">Privacidad</span>
        </p>
      </div>
    </div>
  );
}