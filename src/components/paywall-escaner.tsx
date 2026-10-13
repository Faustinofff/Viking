"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PLAN_ALUMNO_IA, formatearPrecio } from "@/lib/experimental";

const BENEFICIOS = [
  "Sacá una foto de tu plato y la IA estima calorías, proteínas, carbohidratos y grasas.",
  "Hasta 3 análisis por comida: desayuno, almuerzo, snack y cena.",
  "Mirá el resumen de macros de tu día en el momento.",
  "Registrá cada día y seguí tu historial semanal comida por comida.",
];

export default function PaywallEscaner() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suscribir = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("Escribí el email de tu cuenta de Mercado Pago para continuar.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const token = sesion.session?.access_token;
      if (!token) {
        setError("Volvé a iniciar sesión para continuar.");
        return;
      }
      const res = await fetch("/api/experimental/subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ payer_email: e, plan_id: PLAN_ALUMNO_IA.id }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "No pudimos iniciar el pago. Intentá de nuevo.");
        return;
      }
      if (data?.init_point) {
        window.location.href = data.init_point;
        return;
      }
      setError("Mercado Pago no devolvió el link de pago. Intentá de nuevo.");
    } catch {
      setError("No pudimos conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-5 max-w-lg mx-auto pb-10">
      <Link
        href="/alumno/nutricion"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
        <img
          src="/images/landing/escanear-comida.webp"
          alt="Escanear mi comida con inteligencia artificial"
          className="w-full h-auto"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />

        <div className="p-5 space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-white">Escanear mi comida</h1>
            <p className="text-sm text-white/50 mt-1 leading-relaxed">
              Suscribite para desbloquear el análisis de tus comidas con IA.
            </p>
          </div>

          <ul className="space-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-white/70">
                <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="leading-snug">{b}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-white">Suscripción mensual</span>
              <span className="text-lg font-extrabold text-accent">
                ${formatearPrecio(PLAN_ALUMNO_IA.precioMuestra)}
                <span className="text-[10px] font-medium text-white/40">/mes</span>
              </span>
            </div>

            <label className="block text-left">
              <span className="text-xs text-white/40">
                Email de tu cuenta de Mercado Pago <span className="text-red-400">(obligatorio)</span>
              </span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value.trim())}
                placeholder="tuemail@ejemplo.com"
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent"
              />
              <span className="block mt-1 text-[11px] text-white/40">
                Tiene que ser el email con el que entrás a tu cuenta de Mercado Pago. Si ponés otro, el pago falla.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void suscribir()}
              disabled={cargando || !email}
              className="btn-primary w-full text-sm disabled:opacity-40"
            >
              {cargando
                ? "Procesando…"
                : !email
                  ? "Completá el email de Mercado Pago"
                  : `Suscribirme por $${formatearPrecio(PLAN_ALUMNO_IA.precioMuestra)} / mes`}
            </button>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <p className="text-[11px] text-white/35 text-center leading-relaxed">
              Débito automático mensual con Mercado Pago. Podés cancelar cuando quieras.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
