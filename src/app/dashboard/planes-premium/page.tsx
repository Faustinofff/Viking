"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { PLANES_TIER, esCoachGratuito } from "@/lib/data";
import { formatearPrecio, planSuscripcionPorId } from "@/lib/experimental";

export default function PlanesPremiumPage() {
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const cargarSuscripcion = useAppStore((s) => s.cargarSuscripcion);
  const esGratuito = esCoachGratuito(usuarioActual?.email);

  useEffect(() => {
    cargarSuscripcion();
  }, [cargarSuscripcion]);

  const expiracion = premium ? new Date(premium.premiumExpiresAt) : null;
  const activo = expiracion && expiracion > new Date();
  const diasRestantes = expiracion
    ? Math.ceil((expiracion.getTime() - Date.now()) / 86400000)
    : 0;
  const porVencer = activo && diasRestantes <= 7;

  const descripcionDe = (planId: string) =>
    planId === "viking"
      ? "Funciones esenciales para entrenar a tus alumnos"
      : planId === "viking_marca"
        ? "Todo lo de Viking + tu marca personalizada"
        : "Todo lo de Viking Marca + página web profesional";

  const caracteristicasDe = (planId: string) =>
    planId === "viking"
      ? ["Gestión de alumnos", "Rutinas y ejercicios", "Videos e indicaciones", "Series, repeticiones y descansos", "Nutrición", "Seguimiento del progreso", "Viking IA"]
      : planId === "viking_marca"
        ? ["Todo lo incluido en Viking", "Logo personalizado", "Nombre e identidad personalizada", "Experiencia del alumno con tu marca", "Ícono personalizado de la app en el celular del alumno"]
        : ["Todo lo incluido en Viking Marca", "Página web profesional personalizada", "Espacio para presentar tus servicios", "Presencia online profesional"];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Planes Premium</h1>
        <p className="text-white/40 mt-1">Accedé a funciones avanzadas para potenciar tu negocio fitness.</p>
      </div>

      {esGratuito ? (
        <div className="card border border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-lg">✓</div>
            <div>
              <p className="text-lg font-bold text-white">Acceso gratuito vitalicio</p>
              <p className="text-sm text-white/50">No necesitás contratar ningún plan. Tenés acceso completo al sistema.</p>
            </div>
          </div>
        </div>
      ) : premium ? (
        <div className={`card border ${activo ? "border-accent/20 bg-accent/5" : "border-red-500/20 bg-red-500/5"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Estado de suscripción</p>
              {activo ? (
                <>
                  <p className="text-lg font-bold text-white mt-1">Plan {premium.planName}</p>
                  <p className="text-sm text-white/50">
                    Vence: {expiracion?.toLocaleDateString("es-AR")} &middot; {diasRestantes} días restantes
                  </p>
                  {porVencer && <p className="text-sm text-yellow-400 mt-1">⚠ Tu plan vence pronto</p>}
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-red-400 mt-1">❌ Plan vencido</p>
                  <p className="text-sm text-white/50">Vencido el {expiracion?.toLocaleDateString("es-AR")}</p>
                </>
              )}
            </div>
            {activo && (
              <Link href="/experimental/subscription" className="text-xs text-white/40 hover:text-white/60 shrink-0">
                Gestionar suscripción →
              </Link>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLANES_TIER.map((plan) => {
          const sub = planSuscripcionPorId(plan.id);
          if (!sub) return null;
          const descripcion = descripcionDe(plan.id);
          const caracteristicas = caracteristicasDe(plan.id);
          return (
            <div key={plan.id} className="card flex flex-col relative overflow-hidden transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
              {plan.destacado && (
                <div className="absolute top-0 right-0">
                  <div className="bg-accent text-bg-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl">{plan.destacado}</div>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
                <p className="text-sm text-white/40 mt-0.5">{descripcion}</p>
                <p className="mt-3">
                  <span className="text-3xl font-extrabold text-white">${formatearPrecio(sub.precioMuestra)}</span>
                  <span className="text-sm text-white/40 ml-1">/ mes</span>
                </p>
                <p className="text-xs text-white/30 mt-1">Se cobra solo todos los meses. Podés cancelar cuando quieras.</p>
                <div className="mt-4 border-t border-white/[0.06] pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Incluye</p>
                  <ul className="space-y-1.5">
                    {caracteristicas.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                        <span className="text-accent mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Link
                href={`/experimental/subscription?plan=${plan.id}`}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-center bg-accent text-bg-primary hover:bg-accent/90 active:scale-[0.98] transition-all"
              >
                Suscribirme por ${formatearPrecio(sub.precioMuestra)} / mes
              </Link>
            </div>
          );
        })}
      </div>

      <div className="card bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/30 leading-relaxed">
          Pago mensual recurrente procesado de forma segura por Mercado Pago. En el checkout el importe aparece redondeado
          (${formatearPrecio(planSuscripcionPorId("viking")!.precioCobro)}, $
          {formatearPrecio(planSuscripcionPorId("viking_marca")!.precioCobro)} o $
          {formatearPrecio(planSuscripcionPorId("viking_marca_web")!.precioCobro)} según el plan).
        </p>
      </div>
    </div>
  );
}