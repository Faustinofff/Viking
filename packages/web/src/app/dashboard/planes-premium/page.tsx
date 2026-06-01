"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { PLANES_PREMIUM } from "@/lib/data";

export default function PlanesPremiumPage() {
  const premium = useAppStore((s) => s.premium);
  const contratarPremium = useAppStore((s) => s.contratarPremium);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [isDev, setIsDev] = useState(false);

  useEffect(() => { setIsDev(window.location.hostname === "localhost"); }, []);

  const handleContratar = async (planId: string) => {
    setCargando(planId);
    setError("");
    setExito("");
    try {
      const plan = PLANES_PREMIUM.find((p) => p.id === planId);
      if (!plan) throw new Error("Plan no válido");
      await contratarPremium(plan);
      setExito(`Plan ${plan.nombre} activado correctamente ✅`);
    } catch (e: any) {
      setError(e.message);
    }
    setCargando(null);
  };

  const expiracion = premium ? new Date(premium.premiumExpiresAt) : null;
  const activo = expiracion && expiracion > new Date();
  const diasRestantes = expiracion
    ? Math.ceil((expiracion.getTime() - Date.now()) / 86400000)
    : 0;
  const porVencer = activo && diasRestantes <= 7;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Planes Premium</h1>
        <p className="text-white/40 mt-1">
          Accedé a funciones avanzadas para potenciar tu negocio fitness.
        </p>
      </div>

      {/* Estado actual */}
      {premium && (
        <div className={`card border ${activo ? "border-accent/20" : "border-red-500/20"} ${activo ? "bg-accent/5" : "bg-red-500/5"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Estado de suscripción</p>
              {activo ? (
                <>
                  <p className="text-lg font-bold text-white mt-1">
                    Plan {premium.planName}
                  </p>
                  <p className="text-sm text-white/50">
                    Vence: {expiracion?.toLocaleDateString("es-AR")}
                    {" · "}
                    {diasRestantes} días restantes
                  </p>
                  {porVencer && (
                    <p className="text-sm text-yellow-400 mt-1">⚠ Tu plan vence pronto</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-red-400 mt-1">
                    ❌ Plan vencido
                  </p>
                  <p className="text-sm text-white/50">
                    Vencido el {expiracion?.toLocaleDateString("es-AR")}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="card bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {exito && <div className="card bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{exito}</div>}

      {/* Planes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANES_PREMIUM.map((plan) => {
          const contratando = cargando === plan.id;
          return (
            <div
              key={plan.id}
              className="card flex flex-col relative overflow-hidden transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
            >
              {plan.destacado && (
                <div className="absolute top-0 right-0">
                  <div className="bg-accent text-bg-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                    {plan.destacado}
                  </div>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
                <p className="text-sm text-white/50">{plan.dias} días de acceso</p>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">
                    ${plan.precio.toLocaleString("es-AR")}
                  </span>
                  <span className="text-sm text-white/40 ml-1">total</span>
                </div>
                {plan.ahorro && (
                  <p className="text-xs text-green-400 font-semibold mt-1">{plan.ahorro}</p>
                )}
              </div>
              <button
                onClick={() => handleContratar(plan.id)}
                disabled={contratando}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all bg-accent text-bg-primary hover:bg-accent/90 disabled:opacity-50"
              >
                {contratando ? "Procesando..." : isDev ? "Contratar (prueba)" : "Contratar"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="card bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/30 leading-relaxed">
          Al contratar un plan, accedés a funciones premium durante el período seleccionado.
          Si ya tenés un plan activo, los días se agregan a tu vencimiento actual.
          Los pagos son procesados de forma segura por Mercado Pago.
        </p>
      </div>
    </div>
  );
}
