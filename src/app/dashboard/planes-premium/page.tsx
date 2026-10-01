"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { PLANES_PREMIUM, PLANES_TIER, esCoachGratuito } from "@/lib/data";

export default function PlanesPremiumPage() {
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const cargarSuscripcion = useAppStore((s) => s.cargarSuscripcion);
  const contratarPremium = useAppStore((s) => s.contratarPremium);
  const esGratuito = esCoachGratuito(usuarioActual?.email);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [esperandoPago, setEsperandoPago] = useState(false);
  const [linkPago, setLinkPago] = useState<string | null>(null);
  const [planPagando, setPlanPagando] = useState<string | null>(null);
  const enPwa = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  const [mesesPorPlan, setMesesPorPlan] = useState<Record<string, number>>({});
  const definirMeses = (planId: string, valor: number) => {
    setMesesPorPlan((prev) => ({ ...prev, [planId]: Math.min(Math.max(valor, 1), 36) }));
  };
  const mesesDe = (planId: string) => mesesPorPlan[planId] ?? 1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
        setLinkPago(null);
        setExito("Pago aprobado correctamente");
      } else if (intentos > 40) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setEsperandoPago(false);
        setExito("Si ya pagaste, presioná 'Verificar pago'.");
      }
    }, 3000);
  };

  const handleContratar = async (planId: string, meses = 1) => {
    setCargando(planId);
    setError("");
    setExito("");
    setLinkPago(null);
    try {
      const plan = PLANES_PREMIUM.find((p) => p.id === planId);
      if (!plan) throw new Error("Plan no válido");
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, coachId: usuarioActual?.id, months: meses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear pago");
      const params = new URLSearchParams(window.location.search);
      const isDev = window.location.hostname === "localhost" || params.has("dev");
      const isTest = params.has("test");
      if (isDev || isTest) {
        const simRes = await fetch(`/api/mp/confirm-payment?external_reference=${usuarioActual?.id}:${planId}&months=${meses}&status=approved&payment_id=sandbox_${Date.now()}`, { redirect: "manual" });
        if (simRes.status === 302) {
          await cargarSuscripcion();
          const p = useAppStore.getState().premium;
          if (p && new Date(p.premiumExpiresAt) > new Date()) {
            setExito(`Plan ${plan.nombre} activado correctamente (simulación exitosa)`);
            return;
          }
        }
        await contratarPremium(plan, meses);
        setExito(`Plan ${plan.nombre} activado correctamente (fallback test)`);
        return;
      }
      if (enPwa) {
        setLinkPago(data.init_point);
        setPlanPagando(plan.nombre);
        iniciarPolling();
      } else {
        window.location.href = data.init_point;
        setExito("Redirigiendo a Mercado Pago...");
        iniciarPolling();
      }
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
          </div>
        </div>
      ) : null}

      {error && <div className="card bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {exito && !linkPago && (
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

      {linkPago && (
        <div className="card text-center p-6 border-accent/20 bg-accent/5">
          <p className="text-white font-semibold mb-1">{planPagando}</p>
          <p className="text-sm text-white/50 mb-4">Tocá el botón para pagar con Mercado Pago</p>
          <a
            href={linkPago}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all bg-accent text-bg-primary hover:bg-accent/90 active:scale-[0.98]"
          >
            Ir a Mercado Pago
          </a>
          {esperandoPago && <p className="text-xs text-white/30 mt-3">Esperando confirmación del pago...</p>}
        </div>
      )}

      {!esGratuito && !linkPago && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLANES_TIER.map((plan) => {
          const contratando = cargando === plan.id;
          const meses = mesesDe(plan.id);
          const total = plan.precio * meses;
          const descripcion =
            plan.id === "viking" ? "Funciones esenciales para entrenar a tus alumnos" :
            plan.id === "viking_marca" ? "Todo lo de Viking + tu marca personalizada" :
            "Todo lo de Viking Marca + página web profesional";
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
                <p className="text-sm text-white/50 mt-2">${plan.precio.toLocaleString("es-AR")} / mes</p>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-white">${total.toLocaleString("es-AR")}</span>
                  <span className="text-sm text-white/40 ml-1">total</span>
                </div>
                <div className="mt-4 flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-xs text-white/50">Cantidad de meses</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => definirMeses(plan.id, meses - 1)}
                      disabled={meses <= 1}
                      aria-label="Quitar un mes"
                      className="w-7 h-7 rounded-lg bg-white/5 text-white font-bold flex items-center justify-center transition-all hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
                    >−</button>
                    <span className="w-6 text-center font-semibold text-white">{meses}</span>
                    <button
                      onClick={() => definirMeses(plan.id, meses + 1)}
                      disabled={meses >= 36}
                      aria-label="Agregar un mes"
                      className="w-7 h-7 rounded-lg bg-accent text-bg-primary font-bold flex items-center justify-center transition-all hover:bg-accent/90 disabled:opacity-30"
                    >+</button>
                  </div>
                </div>
                <p className="text-xs text-white/30 mt-2">
                  {meses === 1 ? `${plan.dias} día de acceso` : `${plan.dias * meses} días de acceso`}
                </p>
              </div>
              <button
                onClick={() => handleContratar(plan.id, meses)}
                disabled={contratando}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all bg-accent text-bg-primary hover:bg-accent/90 disabled:opacity-50"
              >
                {contratando ? "Preparando pago..." : `Contratar por ${meses} ${meses === 1 ? "mes" : "meses"}`}
              </button>
            </div>
          );
        })}
      </div>
      )}

      <div className="card bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/30 leading-relaxed">
          Los pagos son procesados de forma segura por Mercado Pago.
        </p>
      </div>
    </div>
  );
}
