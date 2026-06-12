"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { PLANES_PREMIUM, esCoachGratuito } from "@/lib/data";

export default function PlanesPremiumPage() {
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const cargarSuscripcion = useAppStore((s) => s.cargarSuscripcion);
  const contratarPremium = useAppStore((s) => s.contratarPremium);
  const esGratuito = esCoachGratuito(usuarioActual?.email);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [isDev, setIsDev] = useState(false);
  const [isTest, setIsTest] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [esperandoPago, setEsperandoPago] = useState(false);
  const esPwa = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDev(window.location.hostname === "localhost" || params.has("dev"));
    setIsTest(params.has("test"));
    if (params.get("ok") === "true") setExito("Pago aprobado correctamente");
    else if (params.get("ok") === "false") setError("El pago fue rechazado o cancelado");
    cargarSuscripcion();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const iniciarPolling = () => {
    setEsperandoPago(true);
    let intentos = 0;
    pollingRef.current = setInterval(async () => {
      intentos++;
      await cargarSuscripcion();
      const estado = useAppStore.getState().premium;
      if (estado && new Date(estado.premiumExpiresAt) > new Date()) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setEsperandoPago(false);
        setExito("Pago aprobado correctamente");
      } else if (intentos > 40) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setEsperandoPago(false);
        setExito("Si ya pagaste, presioná 'Verificar pago'.");
      }
    }, 3000);
  };

  const abrirMercadoPago = (initPoint: string) => {
    if (esPwa) {
      window.location.href = "/api/mp/ir?url=" + encodeURIComponent(initPoint);
    } else {
      window.location.href = initPoint;
    }
  };

  const handleContratar = async (planId: string) => {
    setCargando(planId);
    setError("");
    setExito("");
    try {
      const plan = PLANES_PREMIUM.find((p) => p.id === planId);
      if (!plan) throw new Error("Plan no válido");
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, coachId: usuarioActual?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear pago");
      if (isDev || isTest) {
        const simRes = await fetch(`/api/mp/confirm-payment?external_reference=${usuarioActual?.id}:${planId}&status=approved&payment_id=sandbox_${Date.now()}`, { redirect: "manual" });
        if (simRes.status === 302) {
          await cargarSuscripcion();
          const p = useAppStore.getState().premium;
          if (p && new Date(p.premiumExpiresAt) > new Date()) {
            setExito(`Plan ${plan.nombre} activado correctamente (simulación exitosa)`);
            return;
          }
        }
        await contratarPremium(plan);
        setExito(`Plan ${plan.nombre} activado correctamente (fallback test)`);
        return;
      }
      abrirMercadoPago(data.init_point);
      setExito("Redirigiendo a Mercado Pago...");
      iniciarPolling();
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
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Planes Premium</h1>
        <p className="text-white/40 mt-1">Accedé a funciones avanzadas para potenciar tu negocio fitness.</p>
      </div>

      {esGratuito && (
        <div className="card border border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-lg">✓</div>
            <div>
              <p className="text-lg font-bold text-white">Acceso gratuito vitalicio</p>
              <p className="text-sm text-white/50">No necesitás contratar ningún plan. Tenés acceso completo al sistema.</p>
            </div>
          </div>
        </div>
      )}

      {premium && !esGratuito && (
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
          </div>
        </div>
      )}

      {error && <div className="card bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {exito && (
        <div className="card bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {exito}
          {!esperandoPago && exito.includes("Verificar") && (
            <button onClick={async () => { await cargarSuscripcion(); const p = useAppStore.getState().premium; if (p && new Date(p.premiumExpiresAt) > new Date()) setExito("Pago aprobado correctamente"); else setError("Todavía no recibimos el pago. Si ya pagaste, esperá unos segundos y verificá de nuevo."); }} className="ml-2 underline text-xs">
              Verificar pago
            </button>
          )}
          {esperandoPago && <span className="ml-2 text-xs opacity-70">... verificando cada 3 segundos</span>}
        </div>
      )}

      {!esGratuito && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANES_PREMIUM.map((plan) => {
          const contratando = cargando === plan.id;
          return (
            <div key={plan.id} className="card flex flex-col relative overflow-hidden transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
              {plan.destacado && (
                <div className="absolute top-0 right-0">
                  <div className="bg-accent text-bg-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl">{plan.destacado}</div>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
                <p className="text-sm text-white/50">{plan.dias} días de acceso</p>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">${plan.precio.toLocaleString("es-AR")}</span>
                  <span className="text-sm text-white/40 ml-1">total</span>
                </div>
                {plan.ahorro && <p className="text-xs text-green-400 font-semibold mt-1">{plan.ahorro}</p>}
              </div>
              <button
                onClick={() => handleContratar(plan.id)}
                disabled={contratando}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all bg-accent text-bg-primary hover:bg-accent/90 disabled:opacity-50"
              >
                {contratando ? "Abriendo Mercado Pago..." : isDev || isTest ? "Contratar (test)" : "Contratar"}
              </button>
            </div>
          );
        })}
      </div>
      )}

      <div className="card bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/30 leading-relaxed">
          Al contratar, serás redirigido a Mercado Pago para procesar el pago de forma segura.
        </p>
      </div>
    </div>
  );
}
